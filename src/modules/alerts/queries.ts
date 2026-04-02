import type { SupabaseClient } from '@supabase/supabase-js'
import type { Alert } from './types'
import type { AlertSeverity, AlertType } from '@/lib/supabase/types'

function mapRow(row: any): Alert {
  return {
    id: row.id,
    groupId: row.group_id,
    companyId: row.company_id,
    alertType: row.alert_type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

export async function fetchCompanyAlerts(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { severity?: AlertSeverity; type?: AlertType; unreadOnly?: boolean }
): Promise<Alert[]> {
  let q = supabase
    .from('alerts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters?.severity) q = q.eq('severity', filters.severity)
  if (filters?.type) q = q.eq('alert_type', filters.type)
  if (filters?.unreadOnly) q = q.eq('is_read', false)

  const { data } = await q
  return (data ?? []).map(mapRow)
}

export async function fetchGroupAlerts(
  supabase: SupabaseClient,
  groupId: string,
  filters?: { severity?: AlertSeverity; type?: AlertType; unreadOnly?: boolean; companyId?: string }
): Promise<Alert[]> {
  let q = supabase
    .from('alerts')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (filters?.severity) q = q.eq('severity', filters.severity)
  if (filters?.type) q = q.eq('alert_type', filters.type)
  if (filters?.unreadOnly) q = q.eq('is_read', false)
  if (filters?.companyId) q = q.eq('company_id', filters.companyId)

  const { data } = await q
  return (data ?? []).map(mapRow)
}

export async function markAlertRead(supabase: SupabaseClient, id: string) {
  await supabase.from('alerts').update({ is_read: true }).eq('id', id)
}
