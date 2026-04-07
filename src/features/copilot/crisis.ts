/**
 * Détection du mode crise — règles pondérées explicites, alignées sur le snapshot financier réel.
 */

import type {
  CopilotFinancialSnapshot,
  CrisisModeInput,
  CrisisModeResult,
  CrisisRecommendedPosture,
  CrisisSeverity,
} from './types'

function pickPosture(
  severity: CrisisSeverity,
  snap: CopilotFinancialSnapshot
): CrisisRecommendedPosture {
  if (severity === 'normal') return 'maintain_course'
  const cash = snap.availableCash
  const overdue = snap.totalOverdueAmount
  if (cash != null && overdue != null && overdue > 0 && cash < overdue) return 'cash_first'
  if ((snap.overdueCount ?? 0) >= 4) return 'reduce_outflows'
  if (severity === 'critical') return 'decide_now'
  const net7 = snap.forecastNet7Days
  if (net7 != null && net7 < 0) return 'cash_first'
  return 'stabilize_operations'
}

function pickDominantRisk(input: CrisisModeInput): string {
  const s = input.financial
  const cash = s.availableCash
  const overdue = s.totalOverdueAmount
  if (cash != null && cash < 0) return 'Trésorerie agrégée négative (comptes actifs).'
  if (
    cash != null &&
    overdue != null &&
    overdue > 0 &&
    cash < overdue
  ) {
    return 'Liquidités consolidées inférieures aux montants en retard de paiement.'
  }
  if ((s.overdueCount ?? 0) >= 3) return 'Plusieurs dettes en retard simultanées.'
  const net7 = s.forecastNet7Days
  const due7 = s.dueIn7Days
  const in7 = s.expectedInflows7Days
  if (net7 != null && net7 < 0 && due7 != null && in7 != null) {
    return 'Solde net 7j négatif : sorties à échéance supérieures aux encaissements attendus sur la fenêtre.'
  }
  if (s.weakestEntity && (s.totalOverdueAmount ?? 0) > 0) {
    return `Entité la plus tendue : ${s.weakestEntity.name} — ${s.weakestEntity.reason}`
  }
  if (input.criticalOpenRecommendationsCount >= 1) return 'Recommandations critiques encore ouvertes.'
  if (input.acceptedNotExecutedCount >= 3) return 'Décisions prises mais exécution en retard.'
  if (input.disciplineScore < 40) return 'Dérive de pilotage (discipline faible).'
  return 'Pression cumulée sur le risque et l’exécution.'
}

const WEIGHTS = {
  cash_negative: 5,
  cash_below_overdue: 4,
  net7_deep_negative: 4,
  net7_moderate_negative: 2,
  due_exceeds_inflow_7d: 3,
  overdue_count_high: 2,
  fx_incomplete_stress: 1,
  alerts_critical: 2,
  signals_attention: 2,
  cash_stress_recurrent: 2,
  open_critical_reco: 1,
  accepted_not_done: 2,
  discipline_low: 2,
  postpone_spam: 1,
  weakest_entity: 1,
} as const

/**
 * Score pondéré : seuils calibrés pour limiter les faux positifs si peu de données finance.
 */
export function detectCrisisMode(input: CrisisModeInput): CrisisModeResult {
  const reasons: string[] = []
  const breakdown: Record<string, number> = {}
  const f = input.financial

  let score = 0

  const cash = f.availableCash
  const overdue = f.totalOverdueAmount
  const due7 = f.dueIn7Days
  const in7 = f.expectedInflows7Days
  const net7 = f.forecastNet7Days

  if (cash != null && cash < 0) {
    score += WEIGHTS.cash_negative
    breakdown.cash_negative = WEIGHTS.cash_negative
    reasons.push('Trésorerie agrégée négative.')
  } else if (cash != null && overdue != null && overdue > 0 && cash < overdue) {
    score += WEIGHTS.cash_below_overdue
    breakdown.cash_below_overdue = WEIGHTS.cash_below_overdue
    reasons.push('Cash consolidé inférieur aux montants en retard.')
  }

  if (net7 != null) {
    if (net7 < -5000) {
      score += WEIGHTS.net7_deep_negative
      breakdown.net7_deep_negative = WEIGHTS.net7_deep_negative
      reasons.push('Solde net 7j très déficitaire (sorties vs encaissements attendus).')
    } else if (net7 < 0) {
      score += WEIGHTS.net7_moderate_negative
      breakdown.net7_moderate_negative = WEIGHTS.net7_moderate_negative
      reasons.push('Solde net 7j légèrement déficitaire.')
    }
  }

  if (due7 != null && in7 != null && due7 > in7 && due7 > 0) {
    score += WEIGHTS.due_exceeds_inflow_7d
    breakdown.due_exceeds_inflow_7d = WEIGHTS.due_exceeds_inflow_7d
    reasons.push('Échéances 7j supérieures aux encaissements attendus sur 7j.')
  }

  if ((f.overdueCount ?? 0) >= 3) {
    score += WEIGHTS.overdue_count_high
    breakdown.overdue_count_high = WEIGHTS.overdue_count_high
    reasons.push('Nombre élevé de dettes en retard.')
  }

  if (f.fxIncomplete) {
    score += WEIGHTS.fx_incomplete_stress
    breakdown.fx_incomplete_stress = WEIGHTS.fx_incomplete_stress
    reasons.push('Conversion de devises incomplète — prudence sur les totaux.')
  }

  if (input.criticalAlertsUnread >= 2) {
    score += WEIGHTS.alerts_critical
    breakdown.alerts_critical = WEIGHTS.alerts_critical
    reasons.push('Alertes critiques non lues en attente.')
  }
  if (input.criticalSignalsCount >= 2) {
    score += WEIGHTS.signals_attention
    breakdown.signals_attention = WEIGHTS.signals_attention
    reasons.push('Signaux comportementaux à attention élevée.')
  }
  if (input.cashStressSignalRecurrent) {
    score += WEIGHTS.cash_stress_recurrent
    breakdown.cash_stress_recurrent = WEIGHTS.cash_stress_recurrent
    reasons.push('Stress cash récurrent (signaux répétés).')
  }
  if (input.criticalOpenRecommendationsCount >= 1) {
    score += WEIGHTS.open_critical_reco
    breakdown.open_critical_reco = WEIGHTS.open_critical_reco
    reasons.push('Recommandation(s) critique(s) encore ouverte(s).')
  }
  if (input.acceptedNotExecutedCount >= 4) {
    score += WEIGHTS.accepted_not_done
    breakdown.accepted_not_done = WEIGHTS.accepted_not_done
    reasons.push('Trop de recommandations acceptées non exécutées.')
  }
  if (input.disciplineScore < 38) {
    score += WEIGHTS.discipline_low
    breakdown.discipline_low = WEIGHTS.discipline_low
    reasons.push('Score de discipline faible.')
  }
  if (input.postponedDecisionsLast30d >= 5) {
    score += WEIGHTS.postpone_spam
    breakdown.postpone_spam = WEIGHTS.postpone_spam
    reasons.push('Reports de décisions trop fréquents (30 j).')
  }
  if (f.weakestEntity && (overdue ?? 0) > 0) {
    score += WEIGHTS.weakest_entity
    breakdown.weakest_entity = WEIGHTS.weakest_entity
    reasons.push(`Entité sous tension : ${f.weakestEntity.name}.`)
  }

  let severity: CrisisSeverity = 'normal'
  if (score >= 10) severity = 'critical'
  else if (score >= 6) severity = 'high'
  else if (score >= 3) severity = 'elevated'
  else severity = 'normal'

  const isCrisisMode = severity !== 'normal'

  return {
    isCrisisMode,
    severity,
    reasons: reasons.length ? reasons : isCrisisMode ? ['Contexte tendu sur plusieurs axes.'] : [],
    scoreBreakdown: breakdown,
    scoreTotal: score,
    dominantRisk: pickDominantRisk(input),
    recommendedPosture: pickPosture(severity, f),
  }
}
