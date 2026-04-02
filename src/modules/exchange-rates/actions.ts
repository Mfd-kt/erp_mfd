'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageGroupExchangeRates } from '@/lib/auth'
import { logError } from '@/lib/errors/logger'
import { exchangeRateSchema, updateExchangeRateSchema } from './schema'

function revalidateFxConsumers() {
  revalidatePath('/app/exchange-rates')
  revalidatePath('/app/forecast')
  revalidatePath('/app/global')
  revalidatePath('/app/analytics')
  revalidatePath('/app')
}

export async function createExchangeRate(groupId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageGroupExchangeRates(supabase, groupId)
  const parsed = exchangeRateSchema.parse(formData)

  const payload = {
    from_currency: parsed.from_currency,
    to_currency: parsed.to_currency,
    rate: parsed.rate,
    rate_date: parsed.rate_date,
  }

  const { error } = await supabase.from('exchange_rates').insert(payload as never)
  if (error) {
    if (error.code === '23505') {
      throw new Error('Un taux existe déjà pour cette paire de devises à cette date.')
    }
    await logError({
      serviceName: 'exchange_rates',
      functionName: 'createExchangeRate',
      errorMessage: error.message,
      metadata: { groupId },
    })
    throw new Error(error.message)
  }
  revalidateFxConsumers()
}

export async function updateExchangeRate(groupId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageGroupExchangeRates(supabase, groupId)
  const parsed = updateExchangeRateSchema.parse(formData)

  const payload = {
    from_currency: parsed.from_currency,
    to_currency: parsed.to_currency,
    rate: parsed.rate,
    rate_date: parsed.rate_date,
  }

  const { error } = await supabase
    .from('exchange_rates')
    .update(payload as never)
    .eq('id', parsed.id)

  if (error) {
    if (error.code === '23505') {
      throw new Error('Un taux existe déjà pour cette paire de devises à cette date.')
    }
    await logError({
      serviceName: 'exchange_rates',
      functionName: 'updateExchangeRate',
      errorMessage: error.message,
      metadata: { groupId, id: parsed.id },
    })
    throw new Error(error.message)
  }
  revalidateFxConsumers()
}

export async function deleteExchangeRate(groupId: string, id: string) {
  const supabase = await createClient()
  await assertCanManageGroupExchangeRates(supabase, groupId)
  const { error } = await supabase.from('exchange_rates').delete().eq('id', id)
  if (error) {
    await logError({
      serviceName: 'exchange_rates',
      functionName: 'deleteExchangeRate',
      errorMessage: error.message,
      metadata: { groupId, id },
    })
    throw new Error(error.message)
  }
  revalidateFxConsumers()
}
