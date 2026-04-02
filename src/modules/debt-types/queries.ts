import { createClient } from '@/lib/supabase/server'
import type { DebtType } from '@/lib/supabase/types'

export async function getDebtTypes(companyId: string): Promise<DebtType[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debt_types')
    .select('*')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as DebtType[]
}

export async function getDebtTypeById(companyId: string, debtTypeId: string): Promise<DebtType | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debt_types')
    .select('*')
    .eq('id', debtTypeId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as DebtType
}
