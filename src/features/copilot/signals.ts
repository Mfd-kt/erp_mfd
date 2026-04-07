import type { SupabaseClient } from '@supabase/supabase-js'
import { insertBehaviorSignal, listActiveSignals } from './repository'
import type { CopilotBehaviorSignalRow } from './types'

export async function listSignalsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<CopilotBehaviorSignalRow[]> {
  return listActiveSignals(supabase, userId)
}

export async function recordSignal(
  supabase: SupabaseClient,
  input: {
    userId: string
    signalType: string
    severity: CopilotBehaviorSignalRow['severity']
    description: string
    supportingData?: Record<string, unknown>
  }
): Promise<string> {
  return insertBehaviorSignal(supabase, input)
}
