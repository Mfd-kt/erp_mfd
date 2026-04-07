/**
 * Cycle de vie des décisions sur recommandations (traçabilité copilot_decisions).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CopilotDecisionRow, CopilotDecisionType } from './types'
import {
  insertCopilotDecision,
  listCopilotDecisionsRecent,
  updateCopilotDecisionExecutedById,
  findLatestAcceptedDecisionForRecommendation,
} from './repository'

export function computeDecisionDelay(decidedAtIso: string, executedAtIso: string | null): number | null {
  if (!executedAtIso) return null
  const d = new Date(decidedAtIso).getTime()
  const e = new Date(executedAtIso).getTime()
  if (Number.isNaN(d) || Number.isNaN(e) || e < d) return null
  return Math.floor((e - d) / 86_400_000)
}

export async function createDecision(
  supabase: SupabaseClient,
  input: {
    userId: string
    recommendationId: string
    conversationId: string | null
    decisionType: CopilotDecisionType
    notes?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<CopilotDecisionRow | null> {
  return insertCopilotDecision(supabase, {
    userId: input.userId,
    recommendationId: input.recommendationId,
    conversationId: input.conversationId,
    decisionType: input.decisionType,
    notes: input.notes ?? null,
    metadata: input.metadata ?? {},
  })
}

export async function markDecisionExecuted(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
  executedAt?: string
): Promise<boolean> {
  const row = await findLatestAcceptedDecisionForRecommendation(supabase, userId, recommendationId)
  if (!row) return false
  const at = executedAt ?? new Date().toISOString()
  const delay = computeDecisionDelay(row.decided_at, at)
  return updateCopilotDecisionExecutedById(supabase, userId, row.id, at, delay)
}

export async function listRecentDecisions(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<CopilotDecisionRow[]> {
  return listCopilotDecisionsRecent(supabase, userId, limit)
}
