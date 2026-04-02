import type { SupabaseClient } from '@supabase/supabase-js'

export const SENSITIVE_ACTIONS = [
  'create_sprint',
  'send_whatsapp_notification',
  'send_slack_notification',
  'add_exchange_rate',
] as const

export function requiresConfirmation(actionName: string, payload?: Record<string, unknown>): boolean {
  if (SENSITIVE_ACTIONS.includes(actionName as (typeof SENSITIVE_ACTIONS)[number])) return true
  if (actionName === 'create_task' && ['high', 'critical'].includes(String(payload?.priority))) return true
  return false
}

export function isSensitiveAction(actionName: string): boolean {
  return requiresConfirmation(actionName, {})
}

export interface PendingAction {
  id: string
  conversation_id: string | null
  user_id: string
  action_name: string
  action_payload_json: Record<string, unknown>
  status: 'pending' | 'confirmed' | 'cancelled' | 'executed' | 'failed'
  created_at: string
  confirmed_at: string | null
  executed_at: string | null
}

export async function createPendingAction(
  supabase: SupabaseClient,
  input: {
    conversationId: string | null
    userId: string
    actionName: string
    actionPayload: Record<string, unknown>
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('assistant_pending_actions')
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      action_name: input.actionName,
      action_payload_json: input.actionPayload,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function getPendingActions(
  supabase: SupabaseClient,
  userId: string,
  status: 'pending' = 'pending'
): Promise<PendingAction[]> {
  const { data, error } = await supabase
    .from('assistant_pending_actions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
  if (error) throw new Error(error.message)
  return (data ?? []) as PendingAction[]
}

export async function confirmPendingAction(
  supabase: SupabaseClient,
  actionId: string,
  userId: string
): Promise<{ actionName: string; payload: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from('assistant_pending_actions')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('action_name, action_payload_json')
    .single()
  if (error || !data) return null
  return {
    actionName: (data as { action_name: string }).action_name,
    payload: (data as { action_payload_json: Record<string, unknown> }).action_payload_json ?? {},
  }
}

export async function markPendingActionExecuted(
  supabase: SupabaseClient,
  actionId: string,
  userId: string
) {
  await supabase
    .from('assistant_pending_actions')
    .update({ status: 'executed', executed_at: new Date().toISOString() })
    .eq('id', actionId)
    .eq('user_id', userId)
}

export async function cancelPendingAction(
  supabase: SupabaseClient,
  actionId: string,
  userId: string
) {
  await supabase
    .from('assistant_pending_actions')
    .update({ status: 'cancelled' })
    .eq('id', actionId)
    .eq('user_id', userId)
}
