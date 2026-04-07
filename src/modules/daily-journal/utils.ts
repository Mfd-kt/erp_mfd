import type { MoodLevel } from './types'

/** Décale une date calendaire YYYY-MM-DD (UTC) de `deltaDays` jours. */
export function addDaysToIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return next.toISOString().slice(0, 10)
}

/** Date du jour au format YYYY-MM-DD (UTC), alignée sur le reste de l’app. */
export function todayIsoDateUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Nombre de jours calendaires consécutifs avec une entrée, en remontant depuis aujourd’hui (UTC).
 * Si aujourd’hui n’a pas d’entrée, retourne 0.
 */
export function computeStreak(journalDates: string[]): number {
  const set = new Set(journalDates)
  let day = todayIsoDateUTC()
  let streak = 0
  while (set.has(day)) {
    streak++
    day = addDaysToIsoDate(day, -1)
  }
  return streak
}

/** Ex. "mercredi 2 avril 2026" (fuseau UTC pour la date stockée). */
export function formatJournalDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Sous-titre type « avril 2026 » → « Avril 2026 » (locale courante). */
export function formatCurrentMonthYearCapitalized(): string {
  const s = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Clé mois YYYY-MM pour une entrée. */
export function monthKeyFromJournalDate(journalDate: string): string {
  return journalDate.slice(0, 7)
}

/** Libellé section « MARS 2026 » à partir de YYYY-MM. */
export function formatMonthSectionLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, 1))
  return dt
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

type StatsEntryLite = { journal_date: string; mood: MoodLevel }

/** 7 jours (du plus ancien au plus récent) : humeur ou null si pas d’entrée. */
export function lastSevenDaysMoods(
  statsEntries: StatsEntryLite[],
  todayIso: string
): (MoodLevel | null)[] {
  const byDate = new Map(statsEntries.map((e) => [e.journal_date, e.mood]))
  const out: (MoodLevel | null)[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDaysToIsoDate(todayIso, -i)
    out.push(byDate.get(d) ?? null)
  }
  return out
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Moyenne d’humeur sur les entrées dont la date commence par `yyyyMm` (ex. 2026-04). */
export function averageMoodForMonthPrefix(
  statsEntries: StatsEntryLite[],
  yyyyMm: string
): number | null {
  const subset = statsEntries.filter((e) => e.journal_date.startsWith(yyyyMm))
  if (subset.length === 0) return null
  return round1(subset.reduce((s, e) => s + e.mood, 0) / subset.length)
}

/** Préfixe YYYY-MM du mois civil courant (UTC). */
export function currentMonthPrefixUTC(): string {
  const t = new Date()
  const y = t.getUTCFullYear()
  const m = t.getUTCMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}
