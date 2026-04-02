import { z } from 'zod'

const creditorTypeEnum = z.enum([
  'person',
  'company',
  'employee',
  'government',
  'landlord',
  'bank',
  'other',
])

export const creditorSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  creditor_type: creditorTypeEnum,
  country_code: z.string().length(2).nullable().optional(),
  email: z.string().email('Email invalide').nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const updateCreditorSchema = creditorSchema.extend({
  id: z.string().uuid(),
})

export type CreditorFormData = z.infer<typeof creditorSchema>
export type UpdateCreditorFormData = z.infer<typeof updateCreditorSchema>
