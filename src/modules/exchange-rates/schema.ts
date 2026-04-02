import { z } from 'zod'
import { currencyCodeSchema } from '@/lib/currencies'

export const exchangeRateSchema = z.object({
  from_currency: currencyCodeSchema,
  to_currency: currencyCodeSchema,
  rate: z.number().positive('Le taux doit être strictement positif'),
  rate_date: z.string().min(1, 'Date requise'),
})

export const updateExchangeRateSchema = exchangeRateSchema.extend({
  id: z.string().uuid(),
})

export type ExchangeRateFormData = z.infer<typeof exchangeRateSchema>
