import { createClient } from '@/lib/supabase/server'
import type { Payment } from '@/lib/supabase/types'

export type PaymentWithAccount = Payment & {
  accounts?: { name: string } | null
  account?: { name: string } | null
}

export type PaymentRow = Payment & {
  accounts?: { name: string } | null
  account?: { name: string } | null
  debts?: { title: string; is_recurring_instance?: boolean } | null
  debt?: { title: string; is_recurring_instance?: boolean } | null
}

export interface PaymentFilters {
  from_date?: string
  to_date?: string
  debt_id?: string
}

export async function getPaymentsByCompany(
  companyId: string,
  filters?: PaymentFilters
): Promise<PaymentRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('payments')
    .select('*, accounts(name), debts(title)')
    .eq('company_id', companyId)
    .order('payment_date', { ascending: false })
  if (filters?.from_date) query = query.gte('payment_date', filters.from_date)
  if (filters?.to_date) query = query.lte('payment_date', filters.to_date)
  if (filters?.debt_id) query = query.eq('debt_id', filters.debt_id)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as PaymentRow[]
}

export async function getPaymentStats(
  companyId: string,
  currency: string
): Promise<{ totalThisMonth: number; totalLastMonth: number; count: number }> {
  const supabase = await createClient()
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  const [thisMonthRes, lastMonthRes, countRes] = await Promise.all([
    supabase.from('payments').select('amount_company_currency').eq('company_id', companyId).gte('payment_date', thisMonthStart).lte('payment_date', thisMonthEnd),
    supabase.from('payments').select('amount_company_currency').eq('company_id', companyId).gte('payment_date', lastMonthStart).lte('payment_date', lastMonthEnd),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
  ])

  const sum = (arr: { amount_company_currency?: number }[] | null) =>
    (arr ?? []).reduce((s, p) => s + Number(p.amount_company_currency ?? 0), 0)

  return {
    totalThisMonth: sum(thisMonthRes.data),
    totalLastMonth: sum(lastMonthRes.data),
    count: countRes.count ?? 0,
  }
}

/** Paiements passés par ce compte (sorties). */
export async function getPaymentsByAccount(companyId: string, accountId: string): Promise<PaymentRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, accounts(name), debts(title)')
    .eq('company_id', companyId)
    .eq('account_id', accountId)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PaymentRow[]
}

export async function getPaymentsByDebt(
  companyId: string,
  debtId: string
): Promise<PaymentWithAccount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, accounts(name)')
    .eq('company_id', companyId)
    .eq('debt_id', debtId)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PaymentWithAccount[]
}

/** Paiements liés à une liste de dettes (ex. toutes les dettes d’un créancier). */
export async function getPaymentsByDebtIds(
  companyId: string,
  debtIds: string[]
): Promise<PaymentRow[]> {
  if (debtIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, accounts(name), debts(title, is_recurring_instance)')
    .eq('company_id', companyId)
    .in('debt_id', debtIds)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PaymentRow[]
}
