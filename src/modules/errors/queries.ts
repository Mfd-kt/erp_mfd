import type { SupabaseClient } from '@supabase/supabase-js'

export interface ErrorLogRow {
  id: string
  service_name: string
  function_name: string
  error_message: string
  stack: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function getErrorLogs(
  supabase: SupabaseClient,
  options?: { serviceName?: string; limit?: number }
) {
  let query = supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.serviceName) {
    query = query.eq('service_name', options.serviceName)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ErrorLogRow[]
}
