import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/lib/supabase/types'

export async function getCompaniesByGroup(groupId: string, supabase?: SupabaseClient): Promise<Company[]> {
  const client = supabase ?? (await createClient())
  const { data, error } = await client
    .from('companies')
    .select('*')
    .eq('group_id', groupId)
    .order('legal_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Company[]
}

export async function getCompanyById(groupId: string, companyId: string): Promise<Company | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('group_id', groupId)
    .single()
  if (error || !data) return null
  return data as Company
}
