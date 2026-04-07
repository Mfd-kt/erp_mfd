import type { SupabaseClient } from '@supabase/supabase-js'
import { copilotMemoryItemUpsertSchema } from './schemas'
import { deactivateMemoryItem, listActiveMemoryItems, upsertMemoryItem } from './repository'
import type { CopilotMemoryItemRow, CopilotMemoryType } from './types'

export async function listMemoryForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<CopilotMemoryItemRow[]> {
  return listActiveMemoryItems(supabase, userId)
}

export async function addOrUpdateMemoryItem(
  supabase: SupabaseClient,
  userId: string,
  raw: unknown
): Promise<CopilotMemoryItemRow> {
  const parsed = copilotMemoryItemUpsertSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Mémoire invalide: ${parsed.error.message}`)
  }
  const v = parsed.data
  return upsertMemoryItem(supabase, {
    userId,
    memoryType: v.memory_type as CopilotMemoryType,
    key: v.key,
    valueJson: v.value_json,
    confidenceScore: v.confidence_score,
    incrementSource: true,
  })
}

export async function softDeleteMemoryItem(
  supabase: SupabaseClient,
  userId: string,
  memoryId: string
): Promise<void> {
  await deactivateMemoryItem(supabase, userId, memoryId)
}
