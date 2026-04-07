import { createClient } from '@/lib/supabase/server'
import type { RecurringRuleRow } from './types'

export interface RecurringRulesFilters {
  frequency?: 'monthly' | 'quarterly' | 'yearly'
  is_active?: boolean
  auto_generate?: boolean
  debt_category_id?: string
  creditor_id?: string
}

export async function getRecurringRules(
  companyId: string,
  filters?: RecurringRulesFilters
): Promise<RecurringRuleRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('recurring_rules')
    .select('*, creditors(name), debt_categories(name, code)')
    .eq('company_id', companyId)
    .order('next_run_date', { ascending: true })

  if (filters?.frequency) query = query.eq('frequency', filters.frequency)
  if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active)
  if (filters?.auto_generate !== undefined) query = query.eq('auto_generate', filters.auto_generate)
  if (filters?.debt_category_id) query = query.eq('debt_category_id', filters.debt_category_id)
  if (filters?.creditor_id) query = query.eq('creditor_id', filters.creditor_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as RecurringRuleRow[]

  // Auto-heal legacy inconsistencies where next_run_date predates start_date.
  const inconsistent = rows.filter((r) => r.next_run_date < r.start_date)
  if (inconsistent.length) {
    await Promise.all(
      inconsistent.map((r) =>
        supabase
          .from('recurring_rules')
          .update({ next_run_date: r.start_date, updated_at: new Date().toISOString() })
          .eq('id', r.id)
          .eq('company_id', companyId)
      )
    )
    return rows.map((r) =>
      r.next_run_date < r.start_date ? { ...r, next_run_date: r.start_date } : r
    )
  }

  return rows
}

export async function getRecurringRuleById(
  companyId: string,
  ruleId: string
): Promise<RecurringRuleRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*, creditors(name), debt_categories(name, code)')
    .eq('id', ruleId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as RecurringRuleRow
}
