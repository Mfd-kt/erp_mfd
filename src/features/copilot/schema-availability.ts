import type { CopilotUserProfileRow } from './types'

/** PostgREST / Postgres : table absente ou cache schéma pas à jour. */
export function isMissingRelationError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error?.message) return false
  const m = error.message.toLowerCase()
  return (
    m.includes('could not find the table') ||
    m.includes('schema cache') ||
    (m.includes('relation') && m.includes('does not exist')) ||
    m.includes('undefined table') ||
    error.code === '42P01'
  )
}

/** Profil minimal pour dégradé (UI + prompt) quand les migrations copilot ne sont pas appliquées. */
export function syntheticCopilotProfile(userId: string): CopilotUserProfileRow {
  const now = new Date().toISOString()
  return {
    user_id: userId,
    preferred_tone: null,
    preferred_output_style: null,
    dominant_focus: null,
    estimated_risk_tolerance: null,
    decision_style: null,
    recurring_topics: [],
    recurring_biases: [],
    strong_patterns: [],
    last_profile_update_at: null,
    profile_summary: null,
    metadata: { copilot_tables_missing: true },
    created_at: now,
    updated_at: now,
  }
}

export function isSyntheticCopilotProfile(p: CopilotUserProfileRow): boolean {
  return p.metadata?.copilot_tables_missing === true
}
