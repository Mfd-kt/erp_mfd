// Forecast is read-only and computed server-side; no form schema for creation/update.

/** Ancre pour écrans qui gardent une fenêtre fixe (ex. groupe, outils). */
export const FORECAST_DEFAULT_MONTHS = 6

/**
 * Nombre de mois à projeter : du mois calendaire en cours jusqu’à décembre inclus.
 * Ex. mars → 10 mois (mars…décembre), décembre → 1 mois.
 */
export function getForecastMonthsUntilDecember(referenceDate: Date = new Date()): number {
  const month = referenceDate.getMonth() + 1 // 1–12
  return Math.max(1, 12 - month + 1)
}
