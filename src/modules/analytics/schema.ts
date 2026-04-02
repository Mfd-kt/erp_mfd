import { z } from 'zod'

export const periodPresetSchema = z.enum(['current_month', 'last_3_months', 'last_6_months', 'custom'])
export type PeriodPreset = z.infer<typeof periodPresetSchema>

export const analyticsSearchParamsSchema = z.object({
  preset: periodPresetSchema.optional().default('last_3_months'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type AnalyticsSearchParams = z.infer<typeof analyticsSearchParamsSchema>

/** Build date range from preset or custom from/to */
export function getDateRangeFromParams(params: { preset?: string; from?: string; to?: string }): { from: string; to: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  if (params.preset === 'custom' && params.from && params.to) {
    return { from: params.from, to: params.to }
  }

  switch (params.preset) {
    case 'current_month': {
      const y = now.getFullYear()
      const m = now.getMonth()
      const first = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const last = new Date(y, m + 1, 0).getDate()
      const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
      return { from: first, to: lastDay }
    }
    case 'last_6_months': {
      const from = new Date(now)
      from.setMonth(from.getMonth() - 6)
      const fromStr = from.toISOString().slice(0, 10)
      return { from: fromStr, to: today }
    }
    case 'last_3_months':
    default: {
      const from = new Date(now)
      from.setMonth(from.getMonth() - 3)
      const fromStr = from.toISOString().slice(0, 10)
      return { from: fromStr, to: today }
    }
  }
}
