/**
 * Briefing quotidien : snapshot finance réel + pilotage + cache versionné.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CopilotCompanyRef } from './financial-context'
import { z } from 'zod'
import { buildCopilotFinancialSnapshot, buildFinancialHighlightsLines } from './financial-context'
import { computeDisciplineScore } from './discipline'
import { detectCrisisMode } from './crisis'
import {
  aggregateDecisionsLast30d,
  averageExecutionDelayDays,
  countAcceptedRecommendationsNotDone,
  countCopilotLinkedOverdueTasks,
  countCriticalOpenRecommendations,
  countUnreadCriticalNotifications,
  fetchRecommendationStats,
  getDailyBriefingPayloadForDate,
  listActiveSignals,
  upsertDailyBriefingPayload,
} from './repository'
import type { CopilotBehaviorSignalRow, CopilotFinancialSnapshot, DailyBriefingPayload, DailyBriefingRiskLevel } from './types'

export const BRIEFING_PAYLOAD_VERSION = 2

const crisisResultSchema = z.object({
  isCrisisMode: z.boolean(),
  severity: z.enum(['normal', 'elevated', 'high', 'critical']),
  reasons: z.array(z.string()),
  scoreBreakdown: z.record(z.string(), z.number()),
  scoreTotal: z.number(),
  dominantRisk: z.string(),
  recommendedPosture: z.enum([
    'cash_first',
    'stabilize_operations',
    'reduce_outflows',
    'decide_now',
    'maintain_course',
  ]),
})

const cachedBriefingSchema = z.object({
  payloadVersion: z.literal(BRIEFING_PAYLOAD_VERSION),
  overallRiskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
  headline: z.string(),
  mainRisk: z.string(),
  weakestEntity: z
    .object({ id: z.string(), name: z.string(), reason: z.string() })
    .nullable(),
  decisionOfTheDay: z.string(),
  topActions: z.array(z.string()),
  watchItems: z.array(z.string()),
  financialHighlights: z.array(z.string()),
  disciplineSummary: z.string(),
  generatedAt: z.string(),
  baseCurrency: z.string(),
  sourceSummary: z.array(z.string()),
  discipline: z.object({
    score: z.number(),
    level: z.enum(['low', 'unstable', 'solid', 'strong']),
    execution_score: z.number(),
    responsiveness_score: z.number(),
    focus_score: z.number(),
    followthrough_score: z.number(),
    insights: z.array(z.string()),
    factors: z.record(z.string(), z.object({ contribution: z.number(), label: z.string() })),
  }),
  crisisMode: crisisResultSchema,
  financialSnapshot: z.unknown(),
})

function riskLevelFromCrisis(severity: DailyBriefingPayload['crisisMode']['severity']): DailyBriefingRiskLevel {
  if (severity === 'critical') return 'critical'
  if (severity === 'high') return 'high'
  if (severity === 'elevated') return 'moderate'
  return 'low'
}

function cashStressRecurrent(signals: CopilotBehaviorSignalRow[]): boolean {
  const hits = signals.filter((s) =>
    /cash|trésor|treasury|liquidit|runway|découvert/i.test(`${s.signal_type} ${s.description}`)
  )
  return hits.length >= 2
}

function attentionSignals(signals: CopilotBehaviorSignalRow[]): number {
  return signals.filter((s) => s.severity === 'attention').length
}

function buildFinancialHighlights(s: CopilotFinancialSnapshot, base: string): string[] {
  const lines: string[] = []
  const fmt = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: base }).format(n)

  lines.push(`Cash disponible (consolidé) : ${fmt(s.availableCash)}${s.fxIncomplete ? ' (FX incomplet)' : ''}.`)
  lines.push(
    `Dettes ouvertes : ${fmt(s.totalOpenDebt)} · en retard : ${fmt(s.totalOverdueAmount)} (${s.overdueCount ?? 0} ligne(s)).`
  )
  lines.push(`7 jours — sorties à échéance : ${fmt(s.dueIn7Days)} · encaissements attendus : ${fmt(s.expectedInflows7Days)} · net : ${fmt(s.forecastNet7Days)}.`)
  lines.push(`30 jours — sorties : ${fmt(s.dueIn30Days)} · encaissements : ${fmt(s.expectedInflows30Days)} · net : ${fmt(s.forecastNet30Days)}.`)
  if (s.weakestEntity) {
    lines.push(`Entité la plus tendue : ${s.weakestEntity.name} — ${s.weakestEntity.reason}`)
  }
  if (s.criticalOverdueTasksCount != null && s.criticalOverdueTasksCount > 0) {
    lines.push(`Tâches critiques en retard : ${s.criticalOverdueTasksCount}.`)
  }
  return lines
}

export async function generateDailyBriefing(input: {
  supabase: SupabaseClient
  userId: string
  companies: CopilotCompanyRef[]
  baseCurrency: string
  forceRefresh?: boolean
}): Promise<DailyBriefingPayload> {
  const { supabase, userId, companies, baseCurrency, forceRefresh } = input
  const briefingDate = new Date().toISOString().slice(0, 10)

  if (!forceRefresh) {
    const raw = await getDailyBriefingPayloadForDate(supabase, userId, briefingDate)
    if (raw && (raw as { payloadVersion?: number }).payloadVersion === BRIEFING_PAYLOAD_VERSION) {
      const parsed = cachedBriefingSchema.safeParse(raw)
      if (parsed.success) {
        const p = parsed.data
        return {
          payloadVersion: BRIEFING_PAYLOAD_VERSION,
          overallRiskLevel: p.overallRiskLevel,
          headline: p.headline,
          mainRisk: p.mainRisk,
          weakestEntity: p.weakestEntity,
          decisionOfTheDay: p.decisionOfTheDay,
          topActions: p.topActions,
          watchItems: p.watchItems,
          financialHighlights: p.financialHighlights,
          disciplineSummary: p.disciplineSummary,
          crisisMode: p.crisisMode,
          discipline: p.discipline,
          generatedAt: p.generatedAt,
          baseCurrency: p.baseCurrency,
          sourceSummary: p.sourceSummary,
          financialSnapshot: p.financialSnapshot as CopilotFinancialSnapshot,
        }
      }
    }
  }

  const [
    stats,
    signals,
    financial,
    decisions30,
    avgDelay,
    acceptedPending,
    overdueCopilotTasks,
    critOpenReco,
    critNotifs,
  ] = await Promise.all([
    fetchRecommendationStats(supabase, userId),
    listActiveSignals(supabase, userId, 24),
    buildCopilotFinancialSnapshot(supabase, { companies, baseCurrency }),
    aggregateDecisionsLast30d(supabase, userId),
    averageExecutionDelayDays(supabase, userId),
    countAcceptedRecommendationsNotDone(supabase, userId),
    countCopilotLinkedOverdueTasks(supabase, userId),
    countCriticalOpenRecommendations(supabase, userId),
    countUnreadCriticalNotifications(supabase, userId),
  ])

  const sourceSummary = [
    ...financial.sourceSummary,
    'assistant_recommendations (stats)',
    'copilot_behavior_signals',
    'copilot_decisions (agrégats 30j)',
    'notifications (critiques non lues)',
  ]

  const disciplineInput = {
    recommendationStats: stats,
    openRecommendationsCount: stats.open,
    decisionsLast30d: decisions30,
    acceptedPendingExecutionCount: acceptedPending,
    averageExecutionDelayDays: avgDelay,
    criticalSignalsCount: attentionSignals(signals),
    postponedLast30d: decisions30.postponed,
    copilotOverdueTasksCount: overdueCopilotTasks,
  }

  const discipline = computeDisciplineScore(disciplineInput)

  const crisis = detectCrisisMode({
    financial,
    criticalAlertsUnread: critNotifs,
    criticalSignalsCount: attentionSignals(signals),
    cashStressSignalRecurrent: cashStressRecurrent(signals),
    criticalOpenRecommendationsCount: critOpenReco,
    acceptedNotExecutedCount: acceptedPending,
    disciplineScore: discipline.score,
    postponedDecisionsLast30d: decisions30.postponed,
  })

  const overallRiskLevel = riskLevelFromCrisis(crisis.severity)

  const headline =
    crisis.severity === 'critical'
      ? 'Stop. Priorité unique : sécuriser le cash et les échéances critiques sous 72h.'
      : crisis.severity === 'high'
        ? 'Situation tendue : arbitrages courts, peu de sujets en parallèle.'
        : stats.open >= 8
          ? 'Beaucoup de recommandations ouvertes : clarifie ou ferme avant d’en ajouter.'
          : 'Point du jour : trésorerie réelle + exécution des priorités.'

  const decisionOfTheDay =
    crisis.recommendedPosture === 'cash_first'
      ? 'Décider aujourd’hui : quelles sorties 7j on décale ou quels encaissements on accélère (chiffré).'
      : crisis.recommendedPosture === 'decide_now'
        ? 'Trancher 2 sujets reportés — pas de nouvelle liste.'
        : acceptedPending >= 2
          ? 'Clôturer ou abandonner les recos « acceptées » encore en attente.'
          : 'Une action unique à plus fort levier sur le risque principal (voir highlights).'

  const financialHighlights = buildFinancialHighlightsLines(financial, baseCurrency)

  const topActions: string[] = []
  const p0 = financial.criticalPayments[0]
  if (p0) {
    topActions.push(`Paiement critique : « ${p0.label} » (${p0.dueDate ?? 'date ?'}) — arbitrer ou négocier.`)
  }
  const r0 = financial.criticalReceivables[0]
  if (r0) {
    topActions.push(`Créance à relancer : « ${r0.label} » (${r0.expectedDate ?? 'date ?'}).`)
  }
  if (financial.forecastNet7Days != null && financial.forecastNet7Days < 0) {
    topActions.push('Réduire ou étaler des sorties 7j pour rapprocher le net de zéro (données échéances vs encaissements).')
  }
  if (critOpenReco > 0) {
    topActions.push(`Traiter les recommandations critiques ouvertes (${critOpenReco}).`)
  }
  if (acceptedPending >= 2) {
    topActions.push(`Réduire l’écart accepté / exécuté (${acceptedPending} en attente).`)
  }
  if (stats.open >= 6) {
    topActions.push(`Réduire le stock de recommandations ouvertes (${stats.open}).`)
  }
  if (topActions.length === 0) {
    topActions.push('Contrôler les 3 plus grosses échéances 14j et les 3 plus gros encaissements attendus.')
    topActions.push('Une tâche de suivi sur la dette ou la créance #1 du snapshot.')
  }

  const watchItems: string[] = []
  if ((financial.overdueCount ?? 0) > 0) {
    watchItems.push(`Retards : ${financial.overdueCount} dette(s) (vue debts_with_remaining).`)
  }
  if (critNotifs > 0) {
    watchItems.push(`Alertes critiques non lues : ${critNotifs}.`)
  }
  if (financial.fxIncomplete) {
    watchItems.push('Taux de change manquants : totaux consolidés partiels.')
  }
  signals.slice(0, 3).forEach((s) => {
    watchItems.push(`Signal (${s.severity}) : ${s.description.slice(0, 120)}`)
  })

  const disciplineSummary = `Discipline ${discipline.score}/100 (${discipline.level}) — exécution ${discipline.execution_score}, réactivité ${discipline.responsiveness_score}.`

  const payload: DailyBriefingPayload = {
    payloadVersion: BRIEFING_PAYLOAD_VERSION,
    overallRiskLevel,
    headline,
    mainRisk: crisis.dominantRisk,
    weakestEntity: financial.weakestEntity,
    decisionOfTheDay,
    topActions: topActions.slice(0, 5),
    watchItems: watchItems.slice(0, 8),
    financialHighlights,
    disciplineSummary,
    crisisMode: crisis,
    discipline,
    generatedAt: new Date().toISOString(),
    baseCurrency,
    sourceSummary,
    financialSnapshot: financial,
  }

  await upsertDailyBriefingPayload(supabase, userId, briefingDate, payload as unknown as Record<string, unknown>)

  return payload
}
