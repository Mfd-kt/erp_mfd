import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

const frequencyEnum = z.enum(['monthly', 'quarterly', 'yearly'])

const baseRecurringRuleSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  creditor_id: z.string().uuid().nullable(),
  debt_category_id: z.string().uuid('Catégorie requise'),
  template_description: z.string().max(2000).nullable().optional(),
  amount: z.number().positive('Le montant doit être positif'),
  currency_code: currencyCodeSchema,
  frequency: frequencyEnum,
  interval_count: z.number().int().min(1).default(1),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  month_of_year: z.number().int().min(1).max(12).nullable().optional(),
  start_date: z.string().min(1, 'Date de début requise'),
  end_date: z.string().nullable().optional(),
  auto_generate: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

export const recurringRuleSchema = baseRecurringRuleSchema.superRefine((data, ctx) => {
  if (data.frequency === 'monthly' && (data.day_of_month == null || data.day_of_month < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jour du mois requis (1-31) pour fréquence mensuelle', path: ['day_of_month'] })
  }
  if (data.frequency === 'quarterly' && (data.day_of_month == null || data.day_of_month < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jour du mois requis pour fréquence trimestrielle', path: ['day_of_month'] })
  }
  if (data.frequency === 'yearly') {
    if (data.day_of_month == null || data.day_of_month < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Jour du mois requis pour fréquence annuelle', path: ['day_of_month'] })
    }
    if (data.month_of_year == null || data.month_of_year < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mois de l\'année requis (1-12) pour fréquence annuelle', path: ['month_of_year'] })
    }
  }
  if (data.end_date != null && data.start_date != null && data.end_date < data.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La date de fin doit être >= date de début', path: ['end_date'] })
  }
})

export const updateRecurringRuleSchema = recurringRuleSchema.extend({
  id: z.string().uuid(),
})

export type RecurringRuleFormData = z.infer<typeof recurringRuleSchema>
export type UpdateRecurringRuleFormData = z.infer<typeof updateRecurringRuleSchema>
