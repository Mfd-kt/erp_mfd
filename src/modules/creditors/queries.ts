import { createClient } from '@/lib/supabase/server'
import type { Creditor } from '@/lib/supabase/types'

export async function getCreditors(companyId: string): Promise<Creditor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creditors')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Creditor[]
}

export async function getCreditorById(companyId: string, creditorId: string): Promise<Creditor | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creditors')
    .select('*')
    .eq('id', creditorId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as Creditor
}
