import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

export const revenueSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  revenue_category: z.enum(['client', 'goods_sale', 'other']).default('other'),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().max(200).nullable().optional(),
  source_name: z.string().max(200).nullable().optional(),
  amount_expected: z.number().min(0, 'Le montant attendu doit être positif ou nul'),
  currency_code: currencyCodeSchema,
  expected_date: z.string().min(1, 'Date attendue requise'),
  notes: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.revenue_category === 'client' && !data.client_id && !data.client_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Sélectionne un client ou saisis un nouveau client.',
      path: ['client_id'],
    })
  }
})

export const updateRevenueSchema = revenueSchema.extend({
  id: z.string().uuid(),
})

export const receiveRevenueSchema = z.object({
  amount_received: z.number().min(0, 'Le montant doit être positif ou nul'),
  received_date: z.string().min(1, 'Date de réception requise'),
  account_id: z.string().uuid('Compte requis'),
  notes: z.string().nullable().optional(),
})

export type RevenueFormData = z.infer<typeof revenueSchema>
export type UpdateRevenueFormData = z.infer<typeof updateRevenueSchema>
export type ReceiveRevenueFormData = z.infer<typeof receiveRevenueSchema>
