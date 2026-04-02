import { z } from 'zod'

const scopeType = z.enum(['business', 'personal', 'global'])
const status = z.enum(['planned', 'active', 'completed', 'cancelled'])
const priority = z.enum(['low', 'normal', 'high', 'critical'])

export const sprintSchema = z.object({
  company_id: z.string().uuid().nullable().optional(),
  scope_type: scopeType,
  title: z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).nullable().optional(),
  goal: z.string().max(500).nullable().optional(),
  status: status.default('planned'),
  priority: priority.default('normal'),
  start_date: z.string().min(1, 'Date de début requise'),
  end_date: z.string().min(1, 'Date de fin requise'),
}).refine((d) => !d.end_date || !d.start_date || d.end_date >= d.start_date, {
  message: 'La date de fin doit être >= date de début',
  path: ['end_date'],
})

export const updateSprintSchema = sprintSchema.extend({
  id: z.string().uuid(),
})

export type SprintFormData = z.infer<typeof sprintSchema>
export type UpdateSprintFormData = z.infer<typeof updateSprintSchema>
