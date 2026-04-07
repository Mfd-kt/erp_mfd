/**
 * Construction du contexte enrichi pour le prompt : filtrage, priorisation, typage.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getMessages } from '@/modules/assistant/queries'
import {
  ensureUserProfileRow,
  fetchOpenRecommendationsPreview,
  fetchRecommendationStats,
  listActiveMemoryItems,
  listActiveSignals,
} from './repository'
import type { CopilotCompanyRef } from './financial-context'
import { buildFinancialHighlightsLines } from './financial-context'
import { generateDailyBriefing } from './briefing'
import type { CopilotEnrichedContext, CopilotExecutiveSnapshot, CopilotMemoryItemRow } from './types'

const STOP = new Set([
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'de',
  'du',
  'et',
  'ou',
  'à',
  'a',
  'en',
  'pour',
  'par',
  'sur',
  'dans',
  'est',
  'que',
  'qui',
  'ce',
  'cette',
  'mon',
  'ma',
  'mes',
  'je',
  'tu',
  'il',
  'elle',
  'nous',
  'vous',
  'pas',
  'ne',
  'plus',
  'avec',
  'sans',
  'très',
  'treasury',
])

function tokenize(text: string): Set<string> {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  const words = t.split(/[^a-zA-Z0-9àâäéèêëïîôùûüç]+/u).filter((w) => w.length > 2)
  const out = new Set<string>()
  for (const w of words) {
    if (!STOP.has(w)) out.add(w)
  }
  return out
}

function memoryTextForScore(m: CopilotMemoryItemRow): string {
  return `${m.memory_type} ${m.key} ${JSON.stringify(m.value_json)}`
}

export function scoreMemoryItems(query: string, items: CopilotMemoryItemRow[]): { item: CopilotMemoryItemRow; score: number }[] {
  const qTokens = tokenize(query)
  if (qTokens.size === 0) {
    return items.map((item) => ({ item, score: item.confidence_score * 0.3 }))
  }
  return items.map((item) => {
    const mt = tokenize(memoryTextForScore(item))
    let overlap = 0
    for (const t of qTokens) {
      if (mt.has(t)) overlap++
    }
    const score = overlap * (0.5 + item.confidence_score * 0.5) + item.confidence_score * 0.15
    return { item, score }
  })
}

function pickTopMemories(query: string, items: CopilotMemoryItemRow[], max = 12): CopilotMemoryItemRow[] {
  const scored = scoreMemoryItems(query, items)
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((s) => s.item)
}

function buildThreadSummary(messages: { role: string; content: string }[]): string | null {
  if (messages.length === 0) return null
  const tail = messages.slice(-6)
  const parts = tail.map((m) => {
    const role = m.role === 'user' ? 'Utilisateur' : m.role === 'assistant' ? 'Copilote' : 'Système'
    const snippet = m.content.replace(/\s+/g, ' ').trim().slice(0, 160)
    return `${role}: ${snippet}${m.content.length > 160 ? '…' : ''}`
  })
  return parts.join('\n')
}

function formatProfileBrief(p: CopilotEnrichedContext['profile']): string {
  if (!p) return ''
  const lines: string[] = []
  if (p.profile_summary) lines.push(`Résumé profil: ${p.profile_summary}`)
  if (p.dominant_focus) lines.push(`Focus dominant déclaré/déduit: ${p.dominant_focus}`)
  if (p.preferred_output_style) lines.push(`Style de réponse préféré: ${p.preferred_output_style}`)
  if (p.estimated_risk_tolerance) lines.push(`Tolérance au risque (estimation): ${p.estimated_risk_tolerance}`)
  if (p.recurring_topics.length) lines.push(`Sujets récurrents (tags): ${p.recurring_topics.join(', ')}`)
  if (p.recurring_biases.length) lines.push(`Vigilances (biais possibles, à nuancer): ${p.recurring_biases.join(' | ')}`)
  if (p.strong_patterns.length) lines.push(`Points forts observés: ${p.strong_patterns.join(' | ')}`)
  return lines.join('\n')
}

function formatMemoryLines(items: CopilotMemoryItemRow[]): string {
  return items
    .map(
      (m) =>
        `- [${m.memory_type}] ${m.key} (confiance ${m.confidence_score.toFixed(2)}, sources ${m.source_count}): ${JSON.stringify(m.value_json)}`
    )
    .join('\n')
}

function formatSignalsLines(signals: CopilotEnrichedContext['behaviorSignals']): string {
  if (signals.length === 0) return ''
  return signals
    .map((s) => `- (${s.severity}) ${s.signal_type}: ${s.description}`)
    .join('\n')
}

export function serializeCopilotContext(ctx: CopilotEnrichedContext): string {
  const chunks: string[] = []
  const pb = formatProfileBrief(ctx.profile)
  if (pb) chunks.push(pb)

  if (ctx.recentThreadSummary) {
    chunks.push(`Fil récent (résumé court):\n${ctx.recentThreadSummary}`)
  }

  chunks.push(
    `Statistiques recommandations (système): ouvertes=${ctx.recommendationStats.open}, acceptées=${ctx.recommendationStats.accepted}, ignorées=${ctx.recommendationStats.dismissed}, fait=${ctx.recommendationStats.done}`
  )

  if (ctx.openRecommendations.length) {
    chunks.push(
      `Recommandations ouvertes (aperçu): ${ctx.openRecommendations.map((r) => r.title).join(' | ')}`
    )
  }

  if (ctx.memoryItems.length) {
    chunks.push(`Mémoire structurée pertinente:\n${formatMemoryLines(ctx.memoryItems)}`)
  }

  if (ctx.behaviorSignals.length) {
    chunks.push(`Signaux comportementaux actifs:\n${formatSignalsLines(ctx.behaviorSignals)}`)
  }

  chunks.push(
    `Note transparence: ${ctx.meta.relevanceNote}. Identifiants mémoire utilisés: ${ctx.meta.memoryItemIdsUsed.join(', ') || '—'}.`
  )

  if (ctx.executive?.briefing) {
    const b = ctx.executive.briefing
    chunks.push(
      `Pilotage exécutif (données agrégées, pas inférence LLM) — discipline ${b.discipline.score}/100 (${b.discipline.level}), risque global ${b.overallRiskLevel}.` +
        (b.crisisMode.isCrisisMode
          ? ` Mode crise: ${b.crisisMode.severity} (score ${b.crisisMode.scoreTotal}). Risque dominant: ${b.crisisMode.dominantRisk}.`
          : '')
    )
    chunks.push(`Briefing synthétique: ${b.headline}\nDécision du jour: ${b.decisionOfTheDay}`)
    const finLines = buildFinancialHighlightsLines(b.financialSnapshot, b.baseCurrency).slice(0, 7)
    chunks.push(`Synthèse finance (faits / calculs ERP, ${b.baseCurrency}):\n${finLines.join('\n')}`)
  }

  return chunks.join('\n\n')
}

export interface BuildCopilotContextInput {
  supabase: SupabaseClient
  userId: string
  conversationId: string | null
  currentQuery: string
  /** Si fourni, charge discipline + crise + briefing du jour (cache SQL). */
  executive?: {
    companies: CopilotCompanyRef[]
    baseCurrency: string
    /** Régénère le briefing même si déjà en cache pour cette date. */
    forceBriefingRefresh?: boolean
  }
}

export async function buildCopilotContext(input: BuildCopilotContextInput): Promise<CopilotEnrichedContext> {
  const { supabase, userId, conversationId, currentQuery, executive } = input

  const profile = await ensureUserProfileRow(supabase, userId)

  const [allMemories, signals, openReco, stats, threadMessages, briefingOpt] = await Promise.all([
    listActiveMemoryItems(supabase, userId, 100),
    listActiveSignals(supabase, userId, 8),
    fetchOpenRecommendationsPreview(supabase, userId, 8),
    fetchRecommendationStats(supabase, userId),
    conversationId ? getMessages(supabase, conversationId, 24) : Promise.resolve([]),
    executive
      ? generateDailyBriefing({
          supabase,
          userId,
          companies: executive.companies,
          baseCurrency: executive.baseCurrency,
          forceRefresh: executive.forceBriefingRefresh ?? false,
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  const memories = pickTopMemories(currentQuery, allMemories, 12)
  const memoryItemIdsUsed = memories.map((m) => m.id)

  const recentThreadSummary = threadMessages.length ? buildThreadSummary(threadMessages) : null

  const meta = {
    memoryItemIdsUsed,
    signalIdsUsed: signals.map((s) => s.id),
    relevanceNote:
      'Mémoire filtrée par chevauchement lexical avec la requête + confiance ; signaux récents inclus tels quels.',
  }

  let executiveSnapshot: CopilotExecutiveSnapshot | undefined
  if (briefingOpt) {
    executiveSnapshot = {
      discipline: briefingOpt.discipline,
      crisis: briefingOpt.crisisMode,
      briefing: briefingOpt,
    }
  }

  return {
    profile,
    memoryItems: memories,
    behaviorSignals: signals,
    openRecommendations: openReco,
    recommendationStats: stats,
    recentThreadSummary,
    meta,
    executive: executiveSnapshot,
  }
}
