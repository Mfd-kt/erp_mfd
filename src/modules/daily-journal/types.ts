export type MoodLevel = 1 | 2 | 3 | 4 | 5

export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: 'Très mauvaise',
  2: 'Mauvaise',
  3: 'Correcte',
  4: 'Bonne',
  5: 'Excellente',
}

export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export type JournalEnergyLevel = 'low' | 'medium' | 'high'

export interface DailyJournalEntry {
  id: string
  user_id: string
  journal_date: string
  mood: MoodLevel
  energy_level: JournalEnergyLevel
  accomplished: string | null
  what_failed: string | null
  intentions_tomorrow: string | null
  overall_rating: number | null
  created_at: string
  updated_at: string
}

export type DailyJournalEntryInsert = Omit<
  DailyJournalEntry,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

export interface JournalStats {
  entries: {
    journal_date: string
    mood: MoodLevel
    energy_level: JournalEnergyLevel
    overall_rating: number | null
  }[]
  averageMood: number | null
  averageEnergy: { low: number; medium: number; high: number }
  averageOverallRating: number | null
  totalEntries: number
  streakDays: number
  moodDistribution: Record<MoodLevel, number>
}

export interface JournalCardData {
  todayEntry: DailyJournalEntry | null
  yesterdayEntry: DailyJournalEntry | null
  streakDays: number
  hasAnyEntry: boolean
}
