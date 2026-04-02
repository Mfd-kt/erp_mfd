import { createClient } from '@/lib/supabase/server'
import type { ExchangeRate } from '@/lib/supabase/types'

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('from_currency', { ascending: true })
    .order('to_currency', { ascending: true })
    .order('rate_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ExchangeRate[]
}
