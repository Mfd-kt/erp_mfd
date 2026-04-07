import type { SupabaseClient } from '@supabase/supabase-js'
import { copilotUserProfileUpdateSchema, type CopilotUserProfileUpdate } from './schemas'
import { ensureUserProfileRow, fetchUserProfile, updateUserProfile } from './repository'
import type { CopilotUserProfileRow } from './types'

export async function getOrCreateProfile(supabase: SupabaseClient, userId: string): Promise<CopilotUserProfileRow> {
  return ensureUserProfileRow(supabase, userId)
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<CopilotUserProfileRow | null> {
  return fetchUserProfile(supabase, userId)
}

export async function saveProfilePatch(
  supabase: SupabaseClient,
  userId: string,
  raw: unknown
): Promise<void> {
  const parsed = copilotUserProfileUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Profil invalide: ${parsed.error.message}`)
  }
  const p = parsed.data
  const patch = Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined)
  ) as Partial<CopilotUserProfileUpdate>
  await ensureUserProfileRow(supabase, userId)
  await updateUserProfile(supabase, userId, {
    ...patch,
    last_profile_update_at: new Date().toISOString(),
  })
}
