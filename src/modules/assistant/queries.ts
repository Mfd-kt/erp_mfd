import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantMemory,
  AssistantMemorySource,
  AssistantRecommendation,
  AssistantRun,
} from './types'

export async function getConversations(
  supabase: SupabaseClient,
  userId: string,
  options?: { status?: 'active' | 'archived'; limit?: number }
) {
  let query = supabase
    .from('assistant_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (options?.status) query = query.eq('status', options.status)
  query = query.limit(options?.limit ?? 20)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AssistantConversation[]
}

export async function getConversationById(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<AssistantConversation | null> {
  const { data, error } = await supabase
    .from('assistant_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data as AssistantConversation | null
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 50
): Promise<AssistantMessage[]> {
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as AssistantMessage[]
}

export async function getMemories(
  supabase: SupabaseClient,
  userId: string,
  filters?: { source?: AssistantMemorySource }
): Promise<AssistantMemory[]> {
  let query = supabase.from('assistant_memories').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  if (filters?.source) query = query.eq('source', filters.source)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AssistantMemory[]
}

export async function getRecommendations(
  supabase: SupabaseClient,
  userId: string,
  filters?: { status?: string; severity?: string; limit?: number }
): Promise<AssistantRecommendation[]> {
  let query = supabase
    .from('assistant_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.severity) query = query.eq('severity', filters.severity)
  query = query.limit(filters?.limit ?? 50)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AssistantRecommendation[]
}

export async function getRecentRuns(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<AssistantRun[]> {
  const { data, error } = await supabase
    .from('assistant_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as AssistantRun[]
}

export interface AssistantToolCallRow {
  id: string
  run_id: string | null
  conversation_id: string | null
  user_id: string
  tool_name: string
  tool_arguments_json: Record<string, unknown>
  tool_result_json: Record<string, unknown> | null
  status: 'started' | 'completed' | 'failed'
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export async function getRecentToolCalls(
  supabase: SupabaseClient,
  userId: string,
  options?: { status?: 'started' | 'completed' | 'failed'; limit?: number }
): Promise<AssistantToolCallRow[]> {
  let query = supabase
    .from('assistant_tool_calls')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(options?.limit ?? 50)
  if (options?.status) query = query.eq('status', options.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AssistantToolCallRow[]
}
