import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

const paymentMethodEnum = z.enum([
  'bank_transfer',
  'cash',
  'card',
  'check',
  'other',
])

export const paymentSchema = z.object({
  debt_id: z.string().uuid('Dette requise'),
  account_id: z.string().uuid('Compte requis'),
  amount: z.number().positive('Le montant doit être strictement positif'),
  currency_code: currencyCodeSchema,
  payment_date: z.string().min(1, 'Date de paiement requise'),
  payment_method: paymentMethodEnum.default('bank_transfer'),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type PaymentFormData = z.infer<typeof paymentSchema>
