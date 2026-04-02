import { createClient } from '@/lib/supabase/server'
import type { DebtCategory, DebtType } from '@/lib/supabase/types'

export async function getDebtCategories(
  companyId: string,
  filters?: { debt_type_id?: string }
): Promise<(DebtCategory & { debt_types?: DebtType })[]> {
  const supabase = await createClient()
  let query = supabase
    .from('debt_categories')
    .select('*, debt_types(*)')
    .eq('company_id', companyId)
    .order('code')
  if (filters?.debt_type_id) query = query.eq('debt_type_id', filters.debt_type_id)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as (DebtCategory & { debt_types?: DebtType })[]
}

export async function getDebtCategoryById(
  companyId: string,
  debtCategoryId: string
): Promise<(DebtCategory & { debt_types?: DebtType }) | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debt_categories')
    .select('*, debt_types(*)')
    .eq('id', debtCategoryId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as DebtCategory & { debt_types?: DebtType }
}
