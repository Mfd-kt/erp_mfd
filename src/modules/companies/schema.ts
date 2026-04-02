import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

export const companySchema = z.object({
  legal_name: z.string().min(1, 'La raison sociale est requise').max(200),
  trade_name: z.string().max(200).nullable().optional(),
  type: z.enum(['business', 'personal']).default('business'),
  country_code: z.string().length(2),
  default_currency: currencyCodeSchema,
  timezone: z.string().min(1).default('UTC'),
  is_active: z.boolean().default(true),
})

export const updateCompanySchema = companySchema.extend({
  id: z.string().uuid(),
})

export type CompanyFormData = z.infer<typeof companySchema>
export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>
