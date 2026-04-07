'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { insertFeedbackEvent } from './repository'
import { addOrUpdateMemoryItem, softDeleteMemoryItem } from './memory'
import { saveProfilePatch } from './profile'

export async function saveCopilotProfileAction(raw: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  await saveProfilePatch(supabase, user.id, raw)
  await insertFeedbackEvent(supabase, {
    userId: user.id,
    feedbackType: 'profile_updated',
    payload: { source: 'ui' },
  })
  revalidatePath('/app/assistant/learned')
}

export async function addCopilotMemoryItemAction(raw: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  await addOrUpdateMemoryItem(supabase, user.id, raw)
  await insertFeedbackEvent(supabase, {
    userId: user.id,
    feedbackType: 'memory_created',
    payload: { source: 'ui' },
  })
  revalidatePath('/app/assistant/learned')
}

export async function deactivateCopilotMemoryItemAction(memoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  await softDeleteMemoryItem(supabase, user.id, memoryId)
  await insertFeedbackEvent(supabase, {
    userId: user.id,
    feedbackType: 'memory_deactivated',
    payload: { memoryId },
  })
  revalidatePath('/app/assistant/learned')
}
