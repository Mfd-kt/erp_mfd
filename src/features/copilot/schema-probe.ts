import type { SupabaseClient } from '@supabase/supabase-js'

/** Résultat d’un test lecture sur `copilot_user_profile` (même chemin que le profil copilot). */
export type CopilotSchemaProbeResult = {
  ok: boolean
  message: string | null
  code: string | null
}

/**
 * Vérifie si PostgREST voit la table et si la session peut la lire.
 * À utiliser pour diagnostiquer bandeau « migrations » persistant.
 */
export async function probeCopilotUserProfileAccess(supabase: SupabaseClient): Promise<CopilotSchemaProbeResult> {
  const { error } = await supabase.from('copilot_user_profile').select('user_id').limit(1)
  if (!error) {
    return { ok: true, message: null, code: null }
  }
  return {
    ok: false,
    message: error.message,
    code: error.code ?? null,
  }
}
