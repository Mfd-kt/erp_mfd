import type { DailyJournalEntry, JournalEnergyLevel, MoodLevel } from './types'

export type MonthAggregateStats = {
  entryCount: number
  avgMood: number
  moodMin: MoodLevel
  moodMax: MoodLevel
  energy: Record<JournalEnergyLevel, number>
  avgRating: number | null
  daysWithIntentions: number
  /** Jours du mois couverts (approx. : nombre d’entrées / jours du mois). */
  monthDayCount: number
}

function daysInMonthUtc(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function computeMonthAggregates(
  entries: DailyJournalEntry[],
  monthKey: string
): MonthAggregateStats | null {
  const n = entries.length
  if (n === 0) return null

  let sumMood = 0
  let moodMin: MoodLevel = 5
  let moodMax: MoodLevel = 1
  const energy: Record<JournalEnergyLevel, number> = { low: 0, medium: 0, high: 0 }
  const ratings: number[] = []
  let intentions = 0

  for (const e of entries) {
    const mood = e.mood as MoodLevel
    sumMood += mood
    if (mood < moodMin) moodMin = mood
    if (mood > moodMax) moodMax = mood
    energy[e.energy_level]++
    if (e.overall_rating != null) ratings.push(e.overall_rating)
    if (e.intentions_tomorrow?.trim()) intentions++
  }

  const mdays = daysInMonthUtc(monthKey)

  return {
    entryCount: n,
    avgMood: Math.round((sumMood / n) * 10) / 10,
    moodMin,
    moodMax,
    energy,
    avgRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null,
    daysWithIntentions: intentions,
    monthDayCount: mdays,
  }
}
