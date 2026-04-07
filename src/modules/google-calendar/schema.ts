import { z } from 'zod'

export const createEventSchema = z
  .object({
    calendar_id: z.string().min(1),
    title: z.string().min(1).max(200),
    date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time_start: z.string().optional(),
    time_end: z.string().optional(),
    description: z.string().max(2000).optional().nullable(),
    location: z.string().max(500).optional().nullable(),
    is_all_day: z.boolean().default(false),
  })
  .refine(
    (d) => {
      if (d.is_all_day) return true
      return Boolean(d.time_start && d.time_end)
    },
    { message: 'Heure de début et de fin requises pour un événement horaire.' }
  )
  .refine(
    (d) => d.date_end >= d.date_start,
    { message: 'La date de fin doit être après ou égale au début.' }
  )

export type CreateEventFormValues = z.infer<typeof createEventSchema>
