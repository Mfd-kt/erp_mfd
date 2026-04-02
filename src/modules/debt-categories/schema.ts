import { z } from 'zod'

export const debtCategorySchema = z.object({
  debt_type_id: z.string().uuid('Sélectionnez un type de dette'),
  code: z.string().min(1, 'Le code est requis').max(50),
  name: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().nullable().optional(),
  is_payroll: z.boolean().default(false),
  is_recurring_default: z.boolean().default(false),
})

export const updateDebtCategorySchema = debtCategorySchema.extend({
  id: z.string().uuid(),
})

export type DebtCategoryFormData = z.infer<typeof debtCategorySchema>
export type UpdateDebtCategoryFormData = z.infer<typeof updateDebtCategorySchema>
