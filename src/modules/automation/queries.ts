import type { SupabaseClient } from '@supabase/supabase-js'

export async function getAutomationRules(supabase: SupabaseClient, companyId: string) {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
}

export function summarizeConditions(conditions: Record<string, unknown> | null | undefined) {
  if (!conditions) return 'Aucune condition'
  const parts: string[] = []
  if (typeof conditions.min_amount === 'number') parts.push(`Montant >= ${conditions.min_amount}`)
  if (typeof conditions.priority === 'string') parts.push(`Priorité = ${PRIORITY_LABELS[conditions.priority] ?? conditions.priority}`)
  if (typeof conditions.currency_code === 'string') parts.push(`Devise = ${conditions.currency_code}`)
  return parts.length ? parts.join(' · ') : 'Aucune condition'
}

export const TRIGGER_LABELS: Record<string, string> = {
  debt_overdue: 'Dette en retard',
  revenue_overdue: 'Revenu en retard',
  low_cash_forecast: 'Trésorerie faible',
  recurring_generated: 'Règle récurrente générée',
  payment_created: 'Paiement créé',
}

export function summarizeAction(action: Record<string, unknown> | null | undefined) {
  if (!action || typeof action.type !== 'string') return 'Aucune action'
  if (action.type === 'create_notification') return 'Créer une notification'
  if (action.type === 'create_alert') return 'Créer une alerte'
  if (action.type === 'trigger_webhook') return 'Déclencher un webhook'
  return String(action.type)
}
