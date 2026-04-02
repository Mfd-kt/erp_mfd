import type { FrequencyType } from '@/lib/supabase/types'

/**
 * Deterministic period key for idempotent recurring debt generation.
 * - monthly: YYYY-MM
 * - quarterly: YYYY-Qn (n = 1..4)
 * - yearly: YYYY
 */
export function getPeriodKey(
  frequency: FrequencyType,
  year: number,
  month: number
): string {
  switch (frequency) {
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`
    case 'quarterly': {
      const q = Math.ceil(month / 3) as 1 | 2 | 3 | 4
      return `${year}-Q${q}`
    }
    case 'yearly':
      return String(year)
    default:
      return `${year}-${String(month).padStart(2, '0')}`
  }
}

/** Month (1-12) from quarter 1..4 */
export function getMonthFromQuarter(quarter: number): number {
  return (quarter - 1) * 3 + 1
}

/** Quarter (1-4) from month 1-12 */
export function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3)
}

/**
 * Next period (year, month) after the given one, for the given frequency.
 */
export function getNextPeriod(
  frequency: FrequencyType,
  year: number,
  month: number
): { year: number; month: number } {
  switch (frequency) {
    case 'monthly':
      if (month === 12) return { year: year + 1, month: 1 }
      return { year, month: month + 1 }
    case 'quarterly': {
      const q = getQuarterFromMonth(month)
      if (q === 4) return { year: year + 1, month: 1 }
      return { year, month: (q + 1) * 3 - 2 }
    }
    case 'yearly':
      return { year: year + 1, month: 1 }
    default:
      if (month === 12) return { year: year + 1, month: 1 }
      return { year, month: month + 1 }
  }
}

/**
 * Build due date for a period: year-month-day, with day clamped to last day of month if needed.
 */
export function getDueDateForPeriod(
  year: number,
  month: number,
  dayOfMonth: number
): string {
  const lastDay = new Date(year, month, 0).getDate()
  const day = Math.min(dayOfMonth, lastDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * First day of the period as YYYY-MM-DD (incurred_date).
 */
export function getIncurredDateForPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}
