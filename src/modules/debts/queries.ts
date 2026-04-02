import { createClient } from '@/lib/supabase/server'
import type { DebtWithRemaining } from '@/lib/supabase/types'

export interface DebtFilters {
  computed_status?: string
  priority?: string
  creditor_id?: string
  debt_category_id?: string
}

export type DebtRow = DebtWithRemaining & {
  creditors?: { name: string } | null
  debt_categories?: { name: string; debt_types?: { name: string } | null } | null
}

export async function getDebtsWithRemaining(
  companyId: string,
  filters?: DebtFilters
): Promise<DebtRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('debts_with_remaining')
    .select('*, creditors(name), debt_categories(name, debt_types(name))')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (filters?.computed_status) query = query.eq('computed_status', filters.computed_status)
  if (filters?.priority) query = query.eq('priority', filters.priority)
  if (filters?.creditor_id) query = query.eq('creditor_id', filters.creditor_id)
  if (filters?.debt_category_id) query = query.eq('debt_category_id', filters.debt_category_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as DebtRow[]
}

/** Restant dû par id de dette (devise société), pour plafonds d’édition de paiements. */
export async function getDebtRemainingByDebtId(companyId: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debts_with_remaining')
    .select('id, remaining_company_currency')
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  const map: Record<string, number> = {}
  const rows = (data ?? []) as Pick<DebtWithRemaining, 'id' | 'remaining_company_currency'>[]
  for (const row of rows) {
    map[row.id] = Number(row.remaining_company_currency)
  }
  return map
}

export async function getDebtById(
  companyId: string,
  debtId: string
): Promise<DebtRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debts_with_remaining')
    .select('*, creditors(name), debt_categories(name, debt_types(name))')
    .eq('id', debtId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as DebtRow
}
