import type { ForecastPeriod } from './types'

/** Somme des sorties des 6 mois calendaires suivant le mois d’index `rowIndex` (ce mois est exclu). */
export function sumFollowingSixMonthsOutflows(
  periods: Pick<ForecastPeriod, 'expectedOutflows'>[],
  rowIndex: number
): { sum: number; monthsCounted: number } {
  let sum = 0
  let monthsCounted = 0
  for (let j = 1; j <= 6 && rowIndex + j < periods.length; j++) {
    sum += periods[rowIndex + j].expectedOutflows ?? 0
    monthsCounted++
  }
  return { sum, monthsCounted }
}
