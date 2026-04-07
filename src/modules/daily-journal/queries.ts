import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyJournalEntry, JournalCardData, JournalEnergyLevel, JournalStats, MoodLevel } from './types'
import { addDaysToIsoDate, computeStreak, todayIsoDateUTC } from './utils'

function mapRow(row: Record<string, unknown>): DailyJournalEntry {
  return row as unknown as DailyJournalEntry
}

export async function getJournalEntry(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<DailyJournalEntry | null> {
  const { data, error } = await supabase
    .from('daily_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('journal_date', date)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapRow(data as Record<string, unknown>)
}

/** Nombre d’entrées sur le mois civil courant (UTC). */
export async function getJournalEntriesCountThisMonth(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const t = new Date()
  const y = t.getUTCFullYear()
  const mo = t.getUTCMonth()
  const start = `${y}-${String(mo + 1).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
  const end = `${y}-${String(mo + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { count, error } = await supabase
    .from('daily_journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('journal_date', start)
    .lte('journal_date', end)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getJournalEntries(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<DailyJournalEntry[]> {
  const { data, error } = await supabase
    .from('daily_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('journal_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

/** Toutes les entrées d’un mois civil (YYYY-MM), ordre chronologique croissant. */
export async function getJournalEntriesForMonthPrefix(
  supabase: SupabaseClient,
  userId: string,
  yyyyMm: string
): Promise<DailyJournalEntry[]> {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) throw new Error('Format mois invalide (attendu YYYY-MM)')
  const [y, m] = yyyyMm.split('-').map(Number)
  const start = `${yyyyMm}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${yyyyMm}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('daily_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('journal_date', start)
    .lte('journal_date', end)
    .order('journal_date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

function emptyMoodDistribution(): Record<MoodLevel, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export async function getJournalStats(
  supabase: SupabaseClient,
  userId: string
): Promise<JournalStats> {
  const today = todayIsoDateUTC()
  const windowStart = addDaysToIsoDate(today, -29)

  const [windowRes, allDatesRes] = await Promise.all([
    supabase
      .from('daily_journal_entries')
      .select('journal_date, mood, energy_level, overall_rating')
      .eq('user_id', userId)
      .gte('journal_date', windowStart)
      .lte('journal_date', today)
      .order('journal_date', { ascending: true }),
    supabase.from('daily_journal_entries').select('journal_date').eq('user_id', userId),
  ])

  if (windowRes.error) throw new Error(windowRes.error.message)
  if (allDatesRes.error) throw new Error(allDatesRes.error.message)

  const raw = (windowRes.data ?? []) as {
    journal_date: string
    mood: number
    energy_level: JournalEnergyLevel
    overall_rating: number | null
  }[]

  const entries = raw.map((r) => ({
    journal_date: r.journal_date,
    mood: r.mood as MoodLevel,
    energy_level: r.energy_level,
    overall_rating: r.overall_rating,
  }))

  const totalEntries = entries.length
  const streakDates = [...new Set((allDatesRes.data ?? []).map((r) => r.journal_date as string))]
  const streakDays = computeStreak(streakDates)

  const moodDistribution = emptyMoodDistribution()
  for (const e of entries) {
    const m = e.mood as MoodLevel
    if (m >= 1 && m <= 5) moodDistribution[m]++
  }

  let averageMood: number | null = null
  if (totalEntries > 0) {
    const sum = entries.reduce((s, e) => s + e.mood, 0)
    averageMood = round1(sum / totalEntries)
  }

  const ratings = entries.map((e) => e.overall_rating).filter((x): x is number => x != null)
  let averageOverallRating: number | null = null
  if (ratings.length > 0) {
    averageOverallRating = round1(ratings.reduce((s, x) => s + x, 0) / ratings.length)
  }

  let averageEnergy: { low: number; medium: number; high: number } = { low: 0, medium: 0, high: 0 }
  if (totalEntries > 0) {
    let low = 0
    let medium = 0
    let high = 0
    for (const e of entries) {
      if (e.energy_level === 'low') low++
      else if (e.energy_level === 'medium') medium++
      else high++
    }
    averageEnergy = {
      low: round1((low / totalEntries) * 100),
      medium: round1((medium / totalEntries) * 100),
      high: round1((high / totalEntries) * 100),
    }
  }

  return {
    entries,
    averageMood,
    averageEnergy,
    averageOverallRating,
    totalEntries,
    streakDays,
    moodDistribution,
  }
}

export async function getJournalCardData(
  supabase: SupabaseClient,
  userId: string
): Promise<JournalCardData> {
  const today = todayIsoDateUTC()
  const yesterday = addDaysToIsoDate(today, -1)

  const [pairRes, datesRes] = await Promise.all([
    supabase
      .from('daily_journal_entries')
      .select('*')
      .eq('user_id', userId)
      .in('journal_date', [today, yesterday]),
    supabase.from('daily_journal_entries').select('journal_date').eq('user_id', userId),
  ])

  if (pairRes.error) throw new Error(pairRes.error.message)
  if (datesRes.error) throw new Error(datesRes.error.message)

  const rows = (pairRes.data ?? []) as Record<string, unknown>[]
  const byDate = new Map(rows.map((r) => [(r.journal_date as string) ?? '', mapRow(r)]))

  const todayEntry = byDate.get(today) ?? null
  const yesterdayEntry = byDate.get(yesterday) ?? null

  const streakDates = [...new Set((datesRes.data ?? []).map((r) => r.journal_date as string))]
  const streakDays = computeStreak(streakDates)
  const hasAnyEntry = streakDates.length > 0

  return {
    todayEntry,
    yesterdayEntry,
    streakDays,
    hasAnyEntry,
  }
}
