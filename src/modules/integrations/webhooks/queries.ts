import type { SupabaseClient } from '@supabase/supabase-js'

export async function getWebhooks(supabase: SupabaseClient, companyId: string) {
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
