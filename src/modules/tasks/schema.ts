import { z } from 'zod'

const scopeType = z.enum(['business', 'personal', 'global'])
const taskType = z.enum(['important', 'secondary', 'admin', 'follow_up'])
const status = z.enum(['todo', 'in_progress', 'done', 'cancelled'])
const priority = z.enum(['low', 'normal', 'high', 'critical'])
const energyLevel = z.enum(['low', 'medium', 'high'])

export const taskSchema = z.object({
  company_id: z.string().uuid().nullable().optional(),
  assigned_to_user_id: z.string().uuid().nullable().optional(),
  sprint_id: z.string().uuid().nullable().optional(),
  scope_type: scopeType,
  title: z.string().min(1, 'Titre requis').max(500),
  description: z.string().max(2000).nullable().optional(),
  /** Prochaine étape / commentaire (notamment en cours ou terminé) */
  next_step_comment: z.string().max(2000).nullable().optional(),
  task_type: taskType.default('secondary'),
  status: status.default('todo'),
  priority: priority.default('normal'),
  due_date: z.string().nullable().optional(),
  /** Heure (HH:MM) liée à due_date, optionnelle */
  due_time: z.string().nullable().optional(),
  /** Date de fin de tâche (optionnelle) */
  end_date: z.string().nullable().optional(),
  /** Heure (HH:MM) liée à end_date, optionnelle */
  end_time: z.string().nullable().optional(),
  estimated_minutes: z.number().int().positive().nullable().optional(),
  energy_level: energyLevel.default('medium'),
  linked_entity_type: z.string().nullable().optional(),
  linked_entity_id: z.string().uuid().nullable().optional(),
})

export const updateTaskSchema = taskSchema.extend({
  id: z.string().uuid(),
})

export const updateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  status: status,
})

export type TaskFormData = z.infer<typeof taskSchema>
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>
