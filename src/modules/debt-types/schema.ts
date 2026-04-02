import { z } from 'zod'

export const debtTypeSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50),
  name: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().nullable().optional(),
})

export const updateDebtTypeSchema = debtTypeSchema.extend({
  id: z.string().uuid(),
})

export type DebtTypeFormData = z.infer<typeof debtTypeSchema>
export type UpdateDebtTypeFormData = z.infer<typeof updateDebtTypeSchema>
