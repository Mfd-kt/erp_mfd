import type { SupabaseClient } from '@supabase/supabase-js'

/** Payments in range for expense aggregation (by category/creditor) */
export async function getPaymentsInRange(
  supabase: SupabaseClient,
  companyId: string,
  fromDate: string,
  toDate: string
) {
  const { data } = await supabase
    .from('payments')
    .select('amount_company_currency, debt_id')
    .eq('company_id', companyId)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate)
  return (data ?? []) as { amount_company_currency: number; debt_id: string | null }[]
}

/** Debts with category and creditor for joining to payments */
export async function getDebtCategoryCreditorMap(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data } = await supabase
    .from('debts')
    .select('id, debt_category_id, creditor_id')
    .eq('company_id', companyId)
  const list = (data ?? []) as { id: string; debt_category_id: string; creditor_id: string }[]
  return new Map(list.map((d) => [d.id, { debt_category_id: d.debt_category_id, creditor_id: d.creditor_id }]))
}

/** Category names by id */
export async function getDebtCategoryNames(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data } = await supabase
    .from('debt_categories')
    .select('id, name')
    .or(`company_id.eq.${companyId},company_id.is.null`)
  return new Map((data ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))
}

/** Creditor names by id */
export async function getCreditorNames(supabase: SupabaseClient, companyId: string) {
  const { data } = await supabase
    .from('creditors')
    .select('id, name')
    .eq('company_id', companyId)
  return new Map((data ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))
}

/** Debts with remaining for aging and outstanding (not paid/cancelled) */
export async function getDebtsWithRemainingForAnalytics(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data } = await supabase
    .from('debts_with_remaining')
    .select('id, title, due_date, remaining_company_currency, computed_status, creditor_id')
    .eq('company_id', companyId)
    .not('computed_status', 'in', '("paid","cancelled")')
  return (data ?? []) as {
    id: string
    title: string
    due_date: string | null
    remaining_company_currency: number
    computed_status: string
    creditor_id: string
  }[]
}

/** Revenues in range (for inflows: use amount_received and received_date) */
export async function getRevenuesInRange(
  supabase: SupabaseClient,
  companyId: string,
  fromDate: string,
  toDate: string
) {
  const { data } = await supabase
    .from('revenues')
    .select('amount_received, received_date')
    .eq('company_id', companyId)
    .not('received_date', 'is', null)
    .gte('received_date', fromDate)
    .lte('received_date', toDate)
  return (data ?? []) as { amount_received: number; received_date: string }[]
}

/** Payments in range with date only (for monthly cash outflows) */
export async function getPaymentsByMonthInRange(
  supabase: SupabaseClient,
  companyId: string,
  fromDate: string,
  toDate: string
) {
  const { data } = await supabase
    .from('payments')
    .select('payment_date, amount_company_currency')
    .eq('company_id', companyId)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate)
  return (data ?? []) as { payment_date: string; amount_company_currency: number }[]
}

/** All payments in range with date (for outflows by month) - same as getPaymentsInRange but we need payment_date for grouping */
export async function getPaymentsWithDateInRange(
  supabase: SupabaseClient,
  companyId: string,
  fromDate: string,
  toDate: string
) {
  const { data } = await supabase
    .from('payments')
    .select('payment_date, amount_company_currency')
    .eq('company_id', companyId)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate)
  return (data ?? []) as { payment_date: string; amount_company_currency: number }[]
}
