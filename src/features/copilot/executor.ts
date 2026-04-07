/**
 * Exécution d’actions copilote traçables — politique explicite, pas d’action sensible implicite.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { copilotActionsPayloadSchema, type CopilotActionPayload } from './schemas'
import { copilotActionRequiresExplicitApproval } from './policies'
import { insertAgentActionLog } from './repository'
import type {
  CopilotActionResultItem,
  CopilotActionType,
  CopilotAgentErrorCategory,
  ExecuteCopilotActionsResult,
  ExecutorPolicyContext,
} from './types'

type ResultStatus = CopilotActionResultItem['status']

type LogExtra = {
  errorCode?: string
  errorCategory?: CopilotAgentErrorCategory
  retryable?: boolean
  auditMeta?: Record<string, unknown>
}

async function logLine(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | null,
  actionType: string,
  payload: Record<string, unknown>,
  status: ResultStatus,
  message: string,
  extra?: LogExtra
): Promise<void> {
  await insertAgentActionLog(supabase, {
    userId,
    conversationId,
    actionType,
    payload,
    resultStatus: status,
    resultMessage: message,
    errorCode: extra?.errorCode ?? null,
    errorCategory: extra?.errorCategory ?? null,
    retryable: extra?.retryable ?? null,
    auditMeta: extra?.auditMeta ?? {},
  })
}

function resolveScopeForTask(
  policy: ExecutorPolicyContext,
  companyId: string | undefined
): { scope_type: 'global' | 'business' | 'personal'; company_id: string | null } {
  if (companyId && policy.companyIds.includes(companyId)) {
    return { scope_type: 'business', company_id: companyId }
  }
  if (policy.scopeType === 'personal') return { scope_type: 'personal', company_id: null }
  return { scope_type: policy.scopeType === 'business' ? 'business' : 'global', company_id: null }
}

export async function executeCopilotActions(input: {
  supabase: SupabaseClient
  userId: string
  conversationId: string | null
  actions: unknown[]
  policyContext: ExecutorPolicyContext
}): Promise<ExecuteCopilotActionsResult> {
  const { supabase, userId, conversationId, policyContext } = input
  const parsed = copilotActionsPayloadSchema.safeParse(input.actions)
  if (!parsed.success) {
    await insertAgentActionLog(supabase, {
      userId,
      conversationId,
      actionType: '_executor_batch',
      payload: { actions: input.actions },
      resultStatus: 'error',
      resultMessage: parsed.error.message,
      errorCode: 'COPILOT_ACTIONS_INVALID',
      errorCategory: 'validation',
      retryable: false,
      auditMeta: { issues: parsed.error.flatten() },
    })
    return {
      results: [
        {
          index: 0,
          actionType: 'log_agent_action',
          status: 'error',
          message: `Payload invalide: ${parsed.error.message}`,
          errorCode: 'COPILOT_ACTIONS_INVALID',
          errorCategory: 'validation',
          retryable: false,
        },
      ],
    }
  }

  const results: CopilotActionResultItem[] = []

  for (let i = 0; i < parsed.data.length; i++) {
    const action = parsed.data[i] as CopilotActionPayload & { type: CopilotActionType }
    const basePayload = action as unknown as Record<string, unknown>

    if (copilotActionRequiresExplicitApproval(action.type)) {
      if (!policyContext.explicitApproval) {
        const msg = `Action sensible « ${action.type} » bloquée sans validation explicite.`
        await logLine(supabase, userId, conversationId, action.type, basePayload, 'blocked', msg, {
          errorCode: 'POLICY_SENSITIVE_BLOCKED',
          errorCategory: 'policy',
          retryable: false,
        })
        results.push({
          index: i,
          actionType: action.type,
          status: 'blocked',
          message: msg,
          errorCode: 'POLICY_SENSITIVE_BLOCKED',
          errorCategory: 'policy',
          retryable: false,
        })
        continue
      }
      const msg = 'Action sensible : non implémentée dans cet exécuteur (validation seulement).'
      await logLine(supabase, userId, conversationId, action.type, basePayload, 'skipped', msg, {
        errorCode: 'SENSITIVE_NOT_IMPLEMENTED',
        errorCategory: 'policy',
        retryable: false,
      })
      results.push({
        index: i,
        actionType: action.type,
        status: 'skipped',
        message: msg,
        errorCode: 'SENSITIVE_NOT_IMPLEMENTED',
        errorCategory: 'policy',
        retryable: false,
      })
      continue
    }

    try {
      if (action.type === 'log_agent_action') {
        const msg = `Journal: ${action.label}`
        await logLine(supabase, userId, conversationId, action.type, { ...basePayload, detail: action.detail }, 'success', msg)
        results.push({ index: i, actionType: action.type, status: 'success', message: msg })
        continue
      }

      if (action.type === 'create_task') {
        const { createTask } = await import('@/modules/tasks/actions')
        const sc = resolveScopeForTask(policyContext, action.companyId)
        const row = await createTask({
          title: action.title,
          description: action.description ?? null,
          task_type: 'important',
          status: 'todo',
          priority: action.priority ?? 'normal',
          energy_level: 'medium',
          scope_type: sc.scope_type,
          company_id: sc.company_id,
          assigned_to_user_id: userId,
          linked_entity_type: 'copilot_agent',
          linked_entity_id: conversationId,
        })
        const msg = `Tâche créée (${(row as { id: string }).id}).`
        await logLine(supabase, userId, conversationId, action.type, { ...basePayload, taskId: (row as { id: string }).id }, 'success', msg)
        results.push({
          index: i,
          actionType: action.type,
          status: 'success',
          message: msg,
          detail: { taskId: (row as { id: string }).id },
        })
        continue
      }

      if (action.type === 'create_alert') {
        const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          company_id:
            action.companyId && policyContext.companyIds.includes(action.companyId) ? action.companyId : null,
          title: action.title,
          message: action.message,
          type: action.severity === 'critical' ? 'critical' : action.severity === 'warning' ? 'warning' : 'info',
          is_read: false,
        })
        if (error) throw new Error(error.message)
        const msg = 'Alerte in-app créée.'
        await logLine(supabase, userId, conversationId, action.type, { ...basePayload, alertType: action.alertType }, 'success', msg)
        results.push({ index: i, actionType: action.type, status: 'success', message: msg })
        continue
      }

      if (action.type === 'create_recommendation') {
        const { data, error } = await supabase
          .from('assistant_recommendations')
          .insert({
            user_id: userId,
            company_id: null,
            scope_type: policyContext.scopeType,
            recommendation_type: action.recommendationType,
            severity: action.severity ?? 'info',
            title: action.title,
            body: action.body ?? null,
            status: 'open',
            conversation_id: action.conversationId ?? conversationId,
          })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        const rid = (data as { id: string }).id
        const msg = `Recommandation créée (${rid}).`
        await logLine(supabase, userId, conversationId, action.type, { ...basePayload, recommendationId: rid }, 'success', msg)
        results.push({ index: i, actionType: action.type, status: 'success', message: msg, detail: { recommendationId: rid } })
        continue
      }

      if (action.type === 'create_sprint_item') {
        const { data: sprint, error: sprintErr } = await supabase
          .from('sprints')
          .select('id, company_id, scope_type')
          .eq('id', action.sprintId)
          .maybeSingle()
        if (sprintErr) throw new Error(sprintErr.message)
        if (!sprint) {
          const msg = 'Sprint introuvable ou inaccessible.'
          await logLine(supabase, userId, conversationId, action.type, basePayload, 'error', msg, {
            errorCode: 'SPRINT_NOT_FOUND',
            errorCategory: 'integration',
            retryable: false,
          })
          results.push({
            index: i,
            actionType: action.type,
            status: 'error',
            message: msg,
            errorCode: 'SPRINT_NOT_FOUND',
            errorCategory: 'integration',
            retryable: false,
          })
          continue
        }
        const sp = sprint as { id: string; company_id: string | null; scope_type: string }
        if (sp.company_id && !policyContext.companyIds.includes(sp.company_id)) {
          const msg = 'Sprint hors périmètre société.'
          await logLine(supabase, userId, conversationId, action.type, basePayload, 'blocked', msg, {
            errorCode: 'SPRINT_SCOPE_DENIED',
            errorCategory: 'permission',
            retryable: false,
          })
          results.push({
            index: i,
            actionType: action.type,
            status: 'blocked',
            message: msg,
            errorCode: 'SPRINT_SCOPE_DENIED',
            errorCategory: 'permission',
            retryable: false,
          })
          continue
        }
        const { createTask } = await import('@/modules/tasks/actions')
        const sc = resolveScopeForTask(policyContext, action.companyId)
        const row = await createTask({
          title: action.title,
          description: action.description ?? null,
          sprint_id: action.sprintId,
          task_type: 'secondary',
          status: 'todo',
          priority: action.priority ?? 'normal',
          energy_level: 'medium',
          scope_type: (sp.scope_type as 'global' | 'business' | 'personal') ?? sc.scope_type,
          company_id: sp.company_id ?? sc.company_id,
          assigned_to_user_id: userId,
          linked_entity_type: 'copilot_agent',
          linked_entity_id: conversationId,
        })
        const msg = `Tâche sprint créée (${(row as { id: string }).id}).`
        await logLine(supabase, userId, conversationId, action.type, { ...basePayload, taskId: (row as { id: string }).id }, 'success', msg)
        results.push({
          index: i,
          actionType: action.type,
          status: 'success',
          message: msg,
          detail: { taskId: (row as { id: string }).id },
        })
        continue
      }

      const msg = `Type d’action non géré: ${(action as { type: string }).type}`
      await logLine(supabase, userId, conversationId, String((action as { type: string }).type), basePayload, 'skipped', msg)
      results.push({ index: i, actionType: (action as { type: CopilotActionType }).type, status: 'skipped', message: msg })
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      await logLine(supabase, userId, conversationId, action.type, basePayload, 'error', err, {
        errorCode: 'EXECUTION_ERROR',
        errorCategory: 'integration',
        retryable: true,
        auditMeta: { exception: err },
      })
      results.push({
        index: i,
        actionType: action.type,
        status: 'error',
        message: err,
        errorCode: 'EXECUTION_ERROR',
        errorCategory: 'integration',
        retryable: true,
      })
    }
  }

  return { results }
}
