import type { SupabaseClient } from '@supabase/supabase-js'

export interface JobRunRow {
  id: string
  job_name: string
  status: string
  result_json: Record<string, unknown> | null
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export async function getJobRuns(
  supabase: SupabaseClient,
  options?: { jobName?: string; limit?: number }
) {
  let query = supabase
    .from('job_runs')
    .select('*')
    .order('started_at', { ascending: false })

  if (options?.jobName) {
    query = query.eq('job_name', options.jobName)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as JobRunRow[]
}
