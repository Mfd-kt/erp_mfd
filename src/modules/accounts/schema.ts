import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

const accountTypeEnum = z.enum(['bank', 'cash', 'card', 'wallet'])

export const accountSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  account_type: accountTypeEnum,
  currency_code: currencyCodeSchema,
  opening_balance: z.coerce.number(),
  is_active: z.boolean().default(true),
})

export const updateAccountSchema = accountSchema.extend({
  id: z.string().uuid(),
})

export type AccountFormData = z.infer<typeof accountSchema>
export type UpdateAccountFormData = z.infer<typeof updateAccountSchema>
