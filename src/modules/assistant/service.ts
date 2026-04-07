import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantContext } from './types'
import { buildSystemPrompt } from './prompt'
import {
  buildCopilotContext,
  serializeCopilotContext,
} from '@/features/copilot/context'
import {
  COPILOT_CONSTRUCTIVE_CHALLENGE_BLOCK,
  COPILOT_CRISIS_MODE_BLOCK,
  COPILOT_DISCIPLINE_BLOCK,
  COPILOT_EXECUTION_BLOCK,
  COPILOT_DATA_GROUNDING_BLOCK,
  formatCopilotContextForPrompt,
  formatExecutiveCopilotBlocks,
  formatExecutiveCopilotContextForPrompt,
} from '@/features/copilot/prompts'
import { getMemories } from './queries'
import { formatMemoriesForPrompt } from './memory'
import { readTools, actionTools } from './tools'
import { openaiChatCompletionsProvider } from './providers/openai-chat-completions'
import { logToolCallStart, logToolCallComplete } from './observability'
import { requiresConfirmation, createPendingAction } from './confirmations'
import {
  detectAssistantIntent,
  resolveInitialToolCalls,
  maybeBuildPreloadedContext,
  detectSparseFinancialContext,
} from './router'

const PROVIDER = process.env.ASSISTANT_PROVIDER ?? 'openai-chat-completions'
const provider = openaiChatCompletionsProvider

function getExecuteTool(
  supabase: SupabaseClient,
  ctx: AssistantContext,
  options: {
    runId?: string | null
    conversationId?: string | null
  }
) {
  return async (name: string, args: Record<string, unknown>): Promise<string> => {
    const toolCallId = await logToolCallStart(supabase, {
      runId: options.runId,
      conversationId: options.conversationId,
      userId: ctx.userId,
      toolName: name,
      toolArguments: args,
    })

    try {
      const argsClean = Object.fromEntries(
        Object.entries(args).filter(([k]) => !k.startsWith('_'))
      )
      if (name === 'propose_create_sprint') {
        const result = await actionTools.propose_create_sprint(
          supabase,
          ctx,
          {
            title: argsClean.title as string,
            goal: argsClean.goal as string,
            scopeType: (argsClean.scopeType as string) ?? 'global',
            companyId: argsClean.companyId as string,
            durationDays: argsClean.durationDays as number,
          },
          options.conversationId
        )
        const out = JSON.stringify(result.success ? result.data : { error: result.error })
        await logToolCallComplete(supabase, toolCallId, result.success ? 'completed' : 'failed', out, result.error)
        return out
      }

      if (requiresConfirmation(name, argsClean)) {
        const id = await createPendingAction(supabase, {
          conversationId: options.conversationId ?? null,
          userId: ctx.userId,
          actionName: name,
          actionPayload: argsClean,
        })
        const out = JSON.stringify({
          requiresConfirmation: true,
          pendingActionId: id,
          message: 'Action sensible. Confirmez dans l\'interface.',
        })
        await logToolCallComplete(supabase, toolCallId, 'completed', out)
        return out
      }

      const readToolMap: Record<string, () => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
        get_current_scope_context: () => readTools.get_current_scope_context(ctx),
        list_accessible_companies: () => readTools.list_accessible_companies(ctx, argsClean.filterType as 'business' | 'personal'),
        get_full_global_context: () => readTools.get_full_global_context(ctx),
        search_erp_entities: () => readTools.search_erp_entities(ctx, argsClean.query as string),
        get_admin_obligations: () => readTools.get_admin_obligations(ctx),
        get_global_dashboard: () => readTools.get_global_dashboard(ctx, (argsClean.periodDays as number) ?? 30),
        get_company_dashboard: () => readTools.get_company_dashboard(ctx, argsClean.companyId as string),
        get_global_forecast: () => readTools.get_global_forecast(ctx, (argsClean.periodMonths as number) ?? 3),
        get_company_forecast: () =>
          readTools.get_company_forecast(ctx, argsClean.companyId as string, (argsClean.months as number) ?? 3),
        get_overdue_debts: () => readTools.get_overdue_debts(ctx),
        get_due_soon_debts: () => readTools.get_due_soon_debts(ctx, (argsClean.days as number) ?? 7),
        get_unreceived_revenues: () => readTools.get_unreceived_revenues(ctx),
        get_recent_alerts: () => readTools.get_recent_alerts(ctx),
        get_daily_plan: () => readTools.get_daily_plan(ctx, argsClean.date as string),
        get_open_tasks: () => readTools.get_open_tasks(ctx),
        get_sprint_summary: () => readTools.get_sprint_summary(ctx, argsClean.sprintId as string),
        list_recent_sprints: () => readTools.list_recent_sprints(ctx),
        get_safe_withdrawal_capacity: () => readTools.get_safe_withdrawal_capacity(ctx),
      }

      const actionToolMap: Record<string, () => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
        create_task: () =>
          actionTools.create_task(ctx, {
            title: argsClean.title as string,
            description: argsClean.description as string,
            priority: argsClean.priority as string,
            companyId: argsClean.companyId as string,
          }),
        create_recommendation: () =>
          actionTools.create_recommendation(supabase, ctx, {
            title: argsClean.title as string,
            body: argsClean.body as string,
            severity: argsClean.severity as string,
            recommendationType: argsClean.recommendationType as string,
          }),
        send_slack_notification: () =>
          actionTools.send_slack_notification(ctx, argsClean.title as string, argsClean.message as string),
      }

      const handler = readToolMap[name] ?? actionToolMap[name]
      if (!handler) {
        const err = `Outil inconnu: ${name}`
        await logToolCallComplete(supabase, toolCallId, 'failed', null, err)
        return JSON.stringify({ error: err })
      }

      const result = await handler()
      const out = JSON.stringify(result.success ? result.data : { error: result.error })
      await logToolCallComplete(supabase, toolCallId, result.success ? 'completed' : 'failed', result, result.error)
      return out
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      await logToolCallComplete(supabase, toolCallId, 'failed', null, err)
      return JSON.stringify({ error: err })
    }
  }
}

/**
 * Run pre-routed tools and return results. Logs each call with intent.
 */
async function runPreRoutedTools(
  supabase: SupabaseClient,
  ctx: AssistantContext,
  resolved: { toolName: string; args: Record<string, unknown>; intent: string }[],
  conversationId: string | null
): Promise<{ toolName: string; result: string }[]> {
  const executeTool = getExecuteTool(supabase, ctx, { conversationId })
  const results: { toolName: string; result: string }[] = []
  for (const { toolName, args, intent } of resolved) {
    const argsWithIntent = { ...args, _routed_intent: intent }
    const result = await executeTool(toolName, argsWithIntent)
    results.push({ toolName, result })
  }
  return results
}

export async function chat(
  supabase: SupabaseClient,
  ctx: AssistantContext,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  conversationId?: string
): Promise<{ content: string }> {
  const memories = await getMemories(supabase, ctx.userId)
  const memoriesText = formatMemoriesForPrompt(memories)

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const copilotCtx = await buildCopilotContext({
    supabase,
    userId: ctx.userId,
    conversationId: conversationId ?? null,
    currentQuery: lastUserMessage,
    executive: {
      companies: ctx.companies,
      baseCurrency: ctx.groupBaseCurrency ?? 'EUR',
    },
  })
  const serializedCopilot = serializeCopilotContext(copilotCtx)
  const executiveText = formatExecutiveCopilotBlocks(copilotCtx)
  const crisisBlock = copilotCtx.executive?.crisis.isCrisisMode ? `${COPILOT_CRISIS_MODE_BLOCK}\n` : ''
  const enrichedCopilotContext =
    COPILOT_CONSTRUCTIVE_CHALLENGE_BLOCK +
    COPILOT_DISCIPLINE_BLOCK +
    '\n' +
    COPILOT_EXECUTION_BLOCK +
    '\n' +
    COPILOT_DATA_GROUNDING_BLOCK +
    '\n' +
    crisisBlock +
    (serializedCopilot.trim()
      ? formatCopilotContextForPrompt(serializedCopilot)
      : '\n\n(Aucun bloc mémoire structurée sérialisé pour cette requête — s’appuyer sur les outils ERP.)\n') +
    (executiveText.trim() ? formatExecutiveCopilotContextForPrompt(executiveText) : '')

  const systemPrompt = buildSystemPrompt({
    memories: memoriesText,
    scopeType: ctx.scopeType,
    companyNames: ctx.companies.map((c) => c.trade_name ?? c.legal_name),
    enrichedCopilotContext,
  })

  const executeTool = getExecuteTool(supabase, ctx, { conversationId: conversationId ?? null })

  const intent = detectAssistantIntent(lastUserMessage)
  const resolved = resolveInitialToolCalls(intent, lastUserMessage)

  let preloadedContext = ''
  if (resolved.length > 0) {
    const toolResults = await runPreRoutedTools(
      supabase,
      ctx,
      resolved,
      conversationId ?? null
    )
    preloadedContext = maybeBuildPreloadedContext(intent, toolResults)

    if (intent === 'global_summary' && toolResults.length > 0) {
      try {
        const first = JSON.parse(toolResults[0].result) as Record<string, unknown>
        const dashboard = first?.dashboard as Record<string, unknown> | undefined
        const tasks = first?.openTasksSummary as { count?: number } | undefined
        const alerts = first?.alertsSummary as { critical?: number; warnings?: number } | undefined
        const dailyPlan = first?.dailyPlanSummary as { hasPlan?: boolean } | undefined
        const scope = first?.scope as { accessibleCompanyCount?: number } | undefined
        const sparse = detectSparseFinancialContext({
          totalCash: dashboard?.totalCash as number | undefined,
          totalOpenDebt: dashboard?.totalOpenDebt as number | undefined,
          totalRevenueExpected: dashboard?.totalRevenueExpected as number | undefined,
          overdueCount: dashboard?.overdueCount as number | undefined,
          companiesCount: scope?.accessibleCompanyCount as number | undefined,
          tasksCount: tasks?.count as number | undefined,
          alertsCritical: alerts?.critical as number | undefined,
          alertsWarnings: alerts?.warnings as number | undefined,
          hasPlan: dailyPlan?.hasPlan as boolean | undefined,
        })
        if (sparse.isSparse) {
          preloadedContext += `\n\n--- DÉTECTION SYSTÈME SPARSE ---\nLe système semble vide ou non configuré.\nRaisons: ${sparse.reasons.join('; ')}\nÉtapes recommandées: ${sparse.suggestedSteps.join('; ')}\n---`
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  const enrichedMessages = [...messages]
  if (preloadedContext && lastUserMessage) {
    const lastIdx = enrichedMessages.length - 1
    if (enrichedMessages[lastIdx]?.role === 'user') {
      enrichedMessages[lastIdx] = {
        role: 'user',
        content: `[Contexte préchargé - utilise ces données pour répondre]\n${preloadedContext}\n\n[Question de l'utilisateur]\n${lastUserMessage}`,
      }
    }
  }

  const result = await provider.chat(ctx, enrichedMessages, {
    systemPrompt,
    executeTool,
    executeToolOptions: {
      conversationId: conversationId ?? null,
      userId: ctx.userId,
    },
  })

  return { content: result.content }
}
