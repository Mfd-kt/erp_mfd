'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import type { AssistantContext, AssistantScopeType } from './types'
import { getConversationById, getMessages } from './queries'
import { confirmPendingAction, markPendingActionExecuted, cancelPendingAction } from './confirmations'
import { actionTools } from './tools'
import { chat } from './service'

async function buildContext(scopeType: AssistantScopeType, companyId: string | null): Promise<AssistantContext> {
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')
  const companies = scope.companies
  const companyIds = companies.map((c) => c.id)
  return {
    userId: scope.userId,
    scopeType,
    companyId,
    companyIds,
    companies: companies.map((c) => ({
      id: c.id,
      legal_name: c.legal_name,
      trade_name: c.trade_name,
      default_currency: c.default_currency,
    })),
    groupBaseCurrency: scope.group?.base_currency,
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  scopeType: AssistantScopeType = 'global',
  companyId?: string | null
) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')

  const conv = await getConversationById(supabase, conversationId, scope.userId)
  if (!conv) throw new Error('Conversation introuvable')

  const messages = await getMessages(supabase, conversationId)
  const history = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  const ctx = await buildContext(scopeType, companyId ?? null)

  const { content: assistantContent } = await chat(supabase, ctx, [...history, { role: 'user', content }], conversationId)

  await supabase.from('assistant_messages').insert([
    { conversation_id: conversationId, role: 'user', content },
    { conversation_id: conversationId, role: 'assistant', content: assistantContent },
  ])
  await supabase
    .from('assistant_conversations')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  const messageCount = messages.length + 2
  const shouldSuggestTitle =
    conv.title === 'Nouvelle conversation' &&
    messageCount >= 2

  if (shouldSuggestTitle) {
    suggestConversationTitle(conversationId).catch(() => {})
  }

  revalidatePath('/app/assistant')
  revalidatePath(`/app/assistant/${conversationId}`)
  return { content: assistantContent }
}

export async function updateConversationTitle(conversationId: string, title: string) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')

  const trimmed = title.trim().slice(0, 200)
  if (!trimmed) throw new Error('Titre requis')

  const { error } = await supabase
    .from('assistant_conversations')
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', scope.userId)
  if (error) throw new Error(error.message)
  revalidatePath('/app/assistant')
  revalidatePath(`/app/assistant/${conversationId}`)
}

export async function suggestConversationTitle(
  conversationId: string,
  options?: { force?: boolean }
): Promise<string | null> {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) return null

  const [conv, messages] = await Promise.all([
    getConversationById(supabase, conversationId, scope.userId),
    getMessages(supabase, conversationId, 6),
  ])
  if (!conv || messages.length < 2) return null
  if (!options?.force && conv.title !== 'Nouvelle conversation') return null

  const sample = messages
    .slice(0, 6)
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join('\n')

  try {
    const OpenAI = (await import('openai')).default
    const key = process.env.OPENAI_API_KEY
    if (!key) return null
    const openai = new OpenAI({ apiKey: key })
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Tu génères un titre court (max 50 caractères) pour une conversation. Réponds UNIQUEMENT par le titre, sans guillemets ni ponctuation finale. Exemples: "Situation financière et sociétés", "Réduction des dettes Tunisie", "Plan du jour et tâches".',
        },
        { role: 'user', content: `Conversation:\n${sample}\n\nTitre suggéré:` },
      ],
      max_tokens: 30,
    })
    let suggested = res.choices[0]?.message?.content?.trim()?.slice(0, 100)
    if (suggested) {
      suggested = suggested.replace(/^["']|["']$/g, '').trim()
      if (suggested) {
        await updateConversationTitle(conversationId, suggested)
        return suggested
      }
    }
  } catch {
    // ignore
  }
  return null
}

export async function createConversation(
  scopeType: AssistantScopeType = 'global',
  companyId?: string | null
) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('assistant_conversations')
    .insert({
      user_id: scope.userId,
      scope_type: scopeType,
      company_id: companyId ?? null,
      title: 'Nouvelle conversation',
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/app/assistant')
  return { conversationId: (data as { id: string }).id }
}

export async function createConversationWithPrompt(
  prompt: string,
  scopeType: AssistantScopeType = 'global'
) {
  const { conversationId } = await createConversation(scopeType)
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')

  const messages = await getMessages(supabase, conversationId)
  const history = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  const ctx = await buildContext(scopeType, null)

  const { content: assistantContent } = await chat(supabase, ctx, [...history, { role: 'user', content: prompt }], conversationId)

  await supabase.from('assistant_messages').insert([
    { conversation_id: conversationId, role: 'user', content: prompt },
    { conversation_id: conversationId, role: 'assistant', content: assistantContent },
  ])
  await supabase
    .from('assistant_conversations')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath('/app/assistant')
  revalidatePath(`/app/assistant/${conversationId}`)
  return { conversationId }
}

export async function executePendingAction(pendingActionId: string) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')

  const confirmed = await confirmPendingAction(supabase, pendingActionId, scope.userId)
  if (!confirmed) throw new Error('Action introuvable ou déjà traitée')

  const ctx = await buildContext('global', null)
  let result: { success: boolean; data?: unknown; error?: string }

  switch (confirmed.actionName) {
    case 'create_sprint':
      result = await actionTools.execute_create_sprint(ctx, confirmed.payload as {
        title: string
        goal?: string
        scopeType: string
        companyId?: string
        durationDays?: number
      })
      break
    case 'send_slack_notification':
      result = await actionTools.send_slack_notification(
        ctx,
        confirmed.payload.title as string,
        confirmed.payload.message as string
      )
      break
    default:
      throw new Error(`Action non supportée: ${confirmed.actionName}`)
  }

  await markPendingActionExecuted(supabase, pendingActionId, scope.userId)
  revalidatePath('/app/assistant')
  revalidatePath('/app/assistant/recommendations')
  return result
}

export async function cancelPendingActionAction(pendingActionId: string) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')
  await cancelPendingAction(supabase, pendingActionId, scope.userId)
  revalidatePath('/app/assistant')
}

export async function updateMemoryAction(
  memoryId: string,
  updates: { key?: string; value_json?: Record<string, unknown>; confidence?: number }
) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')
  const { updateMemory } = await import('./memory')
  await updateMemory(supabase, scope.userId, memoryId, updates)
  revalidatePath('/app/assistant/memory')
}

export async function deleteMemoryAction(memoryId: string) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')
  const { data } = await supabase.from('assistant_memories').select('key').eq('id', memoryId).eq('user_id', scope.userId).single()
  if (!data) throw new Error('Mémoire introuvable')
  const { deleteMemory } = await import('./memory')
  await deleteMemory(supabase, scope.userId, (data as { key: string }).key)
  revalidatePath('/app/assistant/memory')
}

export async function updateRecommendationStatus(
  recommendationId: string,
  status: 'open' | 'accepted' | 'dismissed' | 'done'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('assistant_recommendations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', recommendationId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/app/assistant')
  revalidatePath('/app/assistant/recommendations')
}
