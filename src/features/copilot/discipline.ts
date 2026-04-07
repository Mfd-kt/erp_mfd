/**
 * Score de discipline de pilotage — règles explicites, pas de boîte noire.
 */

import type { DisciplineLevel, DisciplineScoreInput, DisciplineScoreResult } from './types'

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function levelFromScore(score: number): DisciplineLevel {
  if (score < 35) return 'low'
  if (score < 55) return 'unstable'
  if (score < 75) return 'solid'
  return 'strong'
}

/**
 * Sous-scores 0–100 puis moyenne pondérée.
 */
export function computeDisciplineScore(input: DisciplineScoreInput): DisciplineScoreResult {
  const { recommendationStats: s, openRecommendationsCount: open } = input

  const openPenalty = clamp(open * 4, 0, 40)
  const backlogRatio = s.open + s.accepted + s.dismissed + s.done > 0 ? s.open / (s.open + s.accepted + s.dismissed + s.done) : 0
  const focusScore = clamp(100 - openPenalty - backlogRatio * 30, 0, 100)

  const decided = input.decisionsLast30d.accepted + input.decisionsLast30d.rejected + input.decisionsLast30d.postponed
  const responsivenessRaw =
    decided > 0 ? (input.decisionsLast30d.accepted + input.decisionsLast30d.rejected) / decided : 0.5
  const postponeRate = decided > 0 ? input.decisionsLast30d.postponed / decided : 0
  const responsivenessScore = clamp(responsivenessRaw * 100 - postponeRate * 50, 0, 100)

  const acceptedTotal = Math.max(1, s.accepted + input.acceptedPendingExecutionCount)
  const execRatio = s.done / acceptedTotal
  const executionScore = clamp(execRatio * 100 - input.acceptedPendingExecutionCount * 6, 0, 100)

  const delay = input.averageExecutionDelayDays
  const delayPenalty = delay == null ? 5 : clamp((delay - 3) * 8, 0, 35)
  const signalPenalty = clamp(input.criticalSignalsCount * 10, 0, 30)
  const overduePenalty = clamp(input.copilotOverdueTasksCount * 8, 0, 35)
  const followthroughScore = clamp(100 - delayPenalty - signalPenalty - overduePenalty, 0, 100)

  const wF = 0.22
  const wR = 0.22
  const wE = 0.28
  const wFo = 0.28
  const score = clamp(focusScore * wF + responsivenessScore * wR + executionScore * wE + followthroughScore * wFo, 0, 100)

  const factors = {
    focus: {
      contribution: (focusScore - 50) / 50,
      label: `Volume de recommandations ouvertes et backlog (focus ${focusScore.toFixed(0)}).`,
    },
    responsiveness: {
      contribution: (responsivenessScore - 50) / 50,
      label: `Réactivité décisionnelle vs reports (${responsivenessScore.toFixed(0)}).`,
    },
    execution: {
      contribution: (executionScore - 50) / 50,
      label: `Ratio exécution sur recommandations acceptées (${executionScore.toFixed(0)}).`,
    },
    followthrough: {
      contribution: (followthroughScore - 50) / 50,
      label: `Suivi, délais et signaux (${followthroughScore.toFixed(0)}).`,
    },
  }

  const result: DisciplineScoreResult = {
    score: Math.round(score),
    level: levelFromScore(score),
    execution_score: Math.round(executionScore),
    responsiveness_score: Math.round(responsivenessScore),
    focus_score: Math.round(focusScore),
    followthrough_score: Math.round(followthroughScore),
    insights: [],
    factors,
  }
  result.insights = buildDisciplineInsights(result, input)
  return result
}

export function buildDisciplineInsights(result: DisciplineScoreResult, input: DisciplineScoreInput): string[] {
  const lines: string[] = []
  if (input.openRecommendationsCount >= 6) {
    lines.push(`Beaucoup de recommandations encore ouvertes (${input.openRecommendationsCount}) : risque de dispersion.`)
  }
  if (input.decisionsLast30d.postponed >= 3) {
    lines.push('Report fréquent des décisions : trancher réduit la charge cognitive et le risque.')
  }
  if (input.acceptedPendingExecutionCount >= 2) {
    lines.push(
      `${input.acceptedPendingExecutionCount} recommandation(s) acceptée(s) mais non marquées « fait » : écart exécution / intention.`
    )
  }
  if (input.criticalSignalsCount >= 1) {
    lines.push('Signaux actifs à traiter : ils pèsent sur le score de suivi.')
  }
  if (input.averageExecutionDelayDays != null && input.averageExecutionDelayDays > 7) {
    lines.push(`Délai moyen entre acceptation et exécution élevé (~${input.averageExecutionDelayDays.toFixed(0)} j).`)
  }
  if (result.score >= 72) {
    lines.push('Discipline solide : tu peux te permettre des plans d’action plus structurés sur 2–3 semaines.')
  } else if (result.score < 45) {
    lines.push('Discipline fragile : réduire le nombre de sujets en parallèle et verrouiller 1–2 actions court terme.')
  }
  return lines
}
