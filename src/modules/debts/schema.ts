import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

const priorityEnum = z.enum(['critical', 'high', 'normal', 'low'])

export const debtSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  creditor_id: z.string().uuid('Créancier requis'),
  debt_category_id: z.string().uuid('Catégorie requise'),
  amount_original: z.number().positive('Le montant doit être positif'),
  currency_code: currencyCodeSchema,
  incurred_date: z.string().min(1, 'Date de survenance requise'),
  due_date: z.string().nullable().optional(),
  priority: priorityEnum.default('normal'),
  notes: z.string().nullable().optional(),
})

export const updateDebtSchema = debtSchema.extend({
  id: z.string().uuid(),
})

export type DebtFormData = z.infer<typeof debtSchema>
export type UpdateDebtFormData = z.infer<typeof updateDebtSchema>
