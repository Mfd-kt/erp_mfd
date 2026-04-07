/**
 * Politique d’exécution : actions autorisées sans validation explicite vs actions sensibles.
 */

import type { CopilotActionType } from './types'

/** Exécution directe autorisée (traçabilité via copilot_agent_action_logs). */
export const COPILOT_SELF_SERVICE_ACTION_TYPES = new Set<CopilotActionType>([
  'create_task',
  'create_alert',
  'create_recommendation',
  'create_sprint_item',
  'log_agent_action',
])

/** Jamais sans validation explicite (garde-fou produit / conformité). */
export const COPILOT_SENSITIVE_ACTION_TYPES = new Set<CopilotActionType>([
  'send_email',
  'mark_payment_done',
  'close_debt',
  'delete_record',
  'transfer_money',
  'modify_financial_record',
])

export function copilotActionRequiresExplicitApproval(actionType: CopilotActionType): boolean {
  return COPILOT_SENSITIVE_ACTION_TYPES.has(actionType)
}
