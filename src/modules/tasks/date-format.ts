/**
 * Formate une date (YYYY-MM-DD ou ISO) avec le jour de la semaine en français.
 * Utilise midi local pour éviter les décalages fuseau sur les dates seules.
 */
export function formatDateWithWeekdayFr(
  isoDate: string | null | undefined,
  options?: { month?: 'short' | 'long' }
): string {
  if (!isoDate) return '—'
  const normalized = isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: options?.month ?? 'short',
  })
}

/** Date-heure ISO avec jour de la semaine (ex. création, terminé le) */
export function formatDateTimeWithWeekdayFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
