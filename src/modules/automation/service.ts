import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyCompanyMembers } from '@/modules/notifications/service'
import { triggerWebhooks } from '@/modules/integrations/webhooks'

export interface AutomationContext {
  amount?: number
  priority?: string | null
  currency_code?: string | null
  entityType: string
  entityId?: string | null
  title?: string
  userId?: string | null
}

function matchesConditions(conditions: Record<string, unknown> | null | undefined, context: AutomationContext) {
  if (!conditions) return true
  const minAmount = typeof conditions.min_amount === 'number' ? conditions.min_amount : null
  const priority = typeof conditions.priority === 'string' ? conditions.priority : null
  const currencyCode = typeof conditions.currency_code === 'string' ? conditions.currency_code : null
  if (minAmount != null && (context.amount ?? 0) < minAmount) return false
  if (priority && context.priority !== priority) return false
  if (currencyCode && context.currency_code !== currencyCode) return false
  return true
}

async function executeAutomationAction(
  supabase: SupabaseClient,
  companyId: string,
  triggerType: string,
  action: Record<string, unknown> | null | undefined,
  context: AutomationContext
) {
  if (!action) return
  const type = typeof action.type === 'string' ? action.type : ''

  if (type === 'create_notification') {
    await notifyCompanyMembers(supabase, companyId, {
      title: typeof action.title === 'string' ? action.title : `Automation: ${triggerType}`,
      message: typeof action.message === 'string' ? action.message : `Action automatique déclenchée sur ${context.title ?? context.entityType}`,
      type: (typeof action.notification_type === 'string' ? action.notification_type : 'info') as 'info' | 'warning' | 'critical' | 'success',
    })
    return
  }

  if (type === 'create_alert') {
    const { error } = await supabase.from('alerts').insert({
      company_id: companyId,
      group_id: null,
      alert_type: 'debt_overdue',
      severity: typeof action.severity === 'string' ? action.severity : 'warning',
      title: typeof action.title === 'string' ? action.title : `Automation: ${triggerType}`,
      message: typeof action.message === 'string' ? action.message : `Alerte automatique sur ${context.title ?? context.entityType}`,
      entity_type: context.entityType,
      entity_id: context.entityId ?? null,
      is_read: false,
      resolved_at: null,
    })
    if (error) console.error('executeAutomationAction alert failed', error)
    return
  }

  if (type === 'trigger_webhook') {
    await triggerWebhooks(supabase, companyId, triggerType, {
      companyId,
      context,
    })
  }
}

export async function runAutomationsForTrigger(
  supabase: SupabaseClient,
  companyId: string,
  triggerType: string,
  context: AutomationContext
) {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (error) {
    console.error('runAutomationsForTrigger query failed', error)
    return
  }

  for (const rule of data ?? []) {
    if (!matchesConditions(rule.condition_json as Record<string, unknown> | null, context)) continue
    await executeAutomationAction(
      supabase,
      companyId,
      triggerType,
      rule.action_json as Record<string, unknown> | null,
      context
    )
  }
}
