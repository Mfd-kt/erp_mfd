import { z } from 'zod'

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)')

const optionalText = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : v),
  z.string().max(20000).nullable()
)

export const upsertJournalEntrySchema = z.object({
  journal_date: dateStr,
  mood: z.coerce.number().int().min(1).max(5),
  energy_level: z.enum(['low', 'medium', 'high']),
  accomplished: optionalText,
  what_failed: optionalText,
  intentions_tomorrow: optionalText,
  overall_rating: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : v),
    z.union([z.coerce.number().int().min(1).max(5), z.null()])
  ),
})

export type UpsertJournalEntryInput = z.infer<typeof upsertJournalEntrySchema>
