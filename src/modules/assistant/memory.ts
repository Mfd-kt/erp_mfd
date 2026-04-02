import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantMemorySource } from './types'

export async function saveMemory(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  value: Record<string, unknown>,
  source: AssistantMemorySource = 'explicit_feedback',
  confidence = 0.8
) {
  const { error } = await supabase.from('assistant_memories').upsert(
    {
      user_id: userId,
      key,
      value_json: value,
      confidence,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,key' }
  )
  if (error) throw new Error(error.message)
}

export async function getMemory(
  supabase: SupabaseClient,
  userId: string,
  key: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('assistant_memories')
    .select('value_json')
    .eq('user_id', userId)
    .eq('key', key)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return (data?.value_json as Record<string, unknown>) ?? null
}

export async function deleteMemory(supabase: SupabaseClient, userId: string, key: string) {
  const { error } = await supabase
    .from('assistant_memories')
    .delete()
    .eq('user_id', userId)
    .eq('key', key)
  if (error) throw new Error(error.message)
}

export async function updateMemory(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  updates: { key?: string; value_json?: Record<string, unknown>; confidence?: number }
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.key !== undefined) payload.key = updates.key
  if (updates.value_json !== undefined) payload.value_json = updates.value_json
  if (updates.confidence !== undefined) payload.confidence = updates.confidence

  const { error } = await supabase
    .from('assistant_memories')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

/**
 * Format memories for inclusion in system prompt.
 */
export function formatMemoriesForPrompt(memories: { key: string; value_json: Record<string, unknown> }[]): string {
  if (memories.length === 0) return ''
  const lines = memories.map((m) => `- ${m.key}: ${JSON.stringify(m.value_json)}`)
  return `Préférences utilisateur (à respecter):\n${lines.join('\n')}\n`
}
