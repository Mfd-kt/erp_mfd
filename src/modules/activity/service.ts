import type { SupabaseClient } from '@supabase/supabase-js'

interface LogActivityInput {
  companyId: string
  userId?: string | null
  actionType: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function logActivity(supabase: SupabaseClient, input: LogActivityInput) {
  const { error } = await supabase.from('activity_logs').insert({
    company_id: input.companyId,
    user_id: input.userId ?? null,
    action_type: input.actionType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  })

  if (error) {
    console.error('logActivity failed', error)
  }
}

export async function getActivityLogs(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { actionType?: string; entityType?: string }
) {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.actionType) query = query.eq('action_type', filters.actionType)
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
