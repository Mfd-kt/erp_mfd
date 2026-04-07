import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { ExchangeRateStrictResult } from './types'

/**
 * Get exchange rate from_currency -> to_currency (1 from = rate to).
 * Returns 1 if same currency or no rate found (legacy; prefer getExchangeRateStrict for forecast).
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return 1
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.rate != null ? Number(data.rate) : 1
}

/**
 * Strict exchange rate lookup for forecast: no default to 1 when rate is missing.
 * - If from_currency === to_currency → { rate: 1, missing: false }
 * - Else: finds latest rate where rate_date <= date, order by rate_date desc, limit 1.
 * - If not found → { rate: null, missing: true }
 */
export async function getExchangeRateStrict(
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<ExchangeRateStrictResult> {
  if (fromCurrency === toCurrency) return { rate: 1, missing: false }
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .lte('rate_date', date)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (data?.rate != null) return { rate: Number(data.rate), missing: false }
  return { rate: null, missing: true }
}

/**
 * Même logique que getExchangeRateStrict, mais avec un client Supabase fourni (jobs, copilote, tests).
 */
export async function getExchangeRateStrictForClient(
  supabase: SupabaseClient,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<ExchangeRateStrictResult> {
  if (fromCurrency === toCurrency) return { rate: 1, missing: false }
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .lte('rate_date', date)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (data?.rate != null) return { rate: Number(data.rate), missing: false }
  return { rate: null, missing: true }
}
