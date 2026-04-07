import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingRelationError, syntheticCopilotProfile } from './schema-availability'
import type {
  CopilotAgentActionLogRow,
  CopilotAgentActionResultStatus,
  CopilotBehaviorSignalRow,
  CopilotDecisionRow,
  CopilotDecisionType,
  CopilotFeedbackEventRow,
  CopilotFeedbackEventType,
  CopilotMemoryItemRow,
  CopilotMemoryType,
  CopilotUserProfileRow,
  CopilotAgentErrorCategory,
  RecommendationStatusStats,
} from './types'

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CopilotUserProfileRow | null> {
  const { data, error } = await supabase.from('copilot_user_profile').select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    if (isMissingRelationError(error)) return null
    throw new Error(error.message)
  }
  if (!data) return null
  const row = data as Record<string, unknown>
  return {
    user_id: String(row.user_id),
    preferred_tone: row.preferred_tone != null ? String(row.preferred_tone) : null,
    preferred_output_style: row.preferred_output_style != null ? String(row.preferred_output_style) : null,
    dominant_focus: row.dominant_focus != null ? String(row.dominant_focus) : null,
    estimated_risk_tolerance: row.estimated_risk_tolerance != null ? String(row.estimated_risk_tolerance) : null,
    decision_style: row.decision_style != null ? String(row.decision_style) : null,
    recurring_topics: Array.isArray(row.recurring_topics) ? (row.recurring_topics as string[]) : [],
    recurring_biases: Array.isArray(row.recurring_biases) ? (row.recurring_biases as string[]) : [],
    strong_patterns: Array.isArray(row.strong_patterns) ? (row.strong_patterns as string[]) : [],
    last_profile_update_at: row.last_profile_update_at != null ? String(row.last_profile_update_at) : null,
    profile_summary: row.profile_summary != null ? String(row.profile_summary) : null,
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function ensureUserProfileRow(supabase: SupabaseClient, userId: string): Promise<CopilotUserProfileRow> {
  const existing = await fetchUserProfile(supabase, userId)
  if (existing) return existing
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('copilot_user_profile')
    .upsert(
      {
        user_id: userId,
        metadata: {},
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()
  if (error) {
    if (isMissingRelationError(error)) {
      console.error('[copilot] copilot_user_profile indisponible via API (mode dégradé):', error.code, error.message)
      return syntheticCopilotProfile(userId)
    }
    throw new Error(error.message)
  }
  const row = data as Record<string, unknown>
  return {
    user_id: String(row.user_id),
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
    metadata: {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<{
    preferred_tone: string | null
    preferred_output_style: string | null
    dominant_focus: string | null
    estimated_risk_tolerance: string | null
    decision_style: string | null
    recurring_topics: string[]
    recurring_biases: string[]
    strong_patterns: string[]
    profile_summary: string | null
    metadata: Record<string, unknown>
    last_profile_update_at: string
  }>
): Promise<void> {
  const { error } = await supabase
    .from('copilot_user_profile')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) {
    if (isMissingRelationError(error)) return
    throw new Error(error.message)
  }
}

export async function listActiveMemoryItems(
  supabase: SupabaseClient,
  userId: string,
  limit = 80
): Promise<CopilotMemoryItemRow[]> {
  const { data, error } = await supabase
    .from('copilot_memory_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []).map(mapMemoryRow)
}

function mapMemoryRow(row: Record<string, unknown>): CopilotMemoryItemRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    memory_type: row.memory_type as CopilotMemoryItemRow['memory_type'],
    key: String(row.key),
    value_json: asRecord(row.value_json),
    confidence_score: Number(row.confidence_score ?? 0),
    source_count: Number(row.source_count ?? 0),
    first_seen_at: String(row.first_seen_at),
    last_seen_at: String(row.last_seen_at),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function deactivateMemoryItem(
  supabase: SupabaseClient,
  userId: string,
  memoryId: string
): Promise<void> {
  const { error } = await supabase
    .from('copilot_memory_items')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', memoryId)
    .eq('user_id', userId)
  if (error) {
    if (isMissingRelationError(error)) return
    throw new Error(error.message)
  }
}

export async function upsertMemoryItem(
  supabase: SupabaseClient,
  input: {
    userId: string
    memoryType: CopilotMemoryType
    key: string
    valueJson: Record<string, unknown>
    confidenceScore?: number
    incrementSource?: boolean
  }
): Promise<CopilotMemoryItemRow> {
  const now = new Date().toISOString()
  const { data: existing, error: selectErr } = await supabase
    .from('copilot_memory_items')
    .select('*')
    .eq('user_id', input.userId)
    .eq('memory_type', input.memoryType)
    .eq('key', input.key)
    .maybeSingle()

  if (selectErr) {
    if (isMissingRelationError(selectErr)) {
      throw new Error('Migrations copilot non appliquées : exécute supabase/migrations/20260331130000_copilot_memory_system.sql')
    }
    throw new Error(selectErr.message)
  }

  if (existing) {
    const row = existing as Record<string, unknown>
    const nextCount = input.incrementSource ? Number(row.source_count ?? 0) + 1 : Number(row.source_count ?? 0)
    const { data, error } = await supabase
      .from('copilot_memory_items')
      .update({
        value_json: input.valueJson,
        confidence_score: input.confidenceScore ?? Number(row.confidence_score ?? 0.5),
        source_count: nextCount,
        last_seen_at: now,
        updated_at: now,
        is_active: true,
      })
      .eq('id', String(row.id))
      .select('*')
      .single()
    if (error) {
      if (isMissingRelationError(error)) {
        throw new Error('Migrations copilot non appliquées : exécute supabase/migrations/20260331130000_copilot_memory_system.sql')
      }
      throw new Error(error.message)
    }
    return mapMemoryRow(data as Record<string, unknown>)
  }

  const { data, error } = await supabase
    .from('copilot_memory_items')
    .insert({
      user_id: input.userId,
      memory_type: input.memoryType,
      key: input.key,
      value_json: input.valueJson,
      confidence_score: input.confidenceScore ?? 0.55,
      source_count: 1,
      first_seen_at: now,
      last_seen_at: now,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()
  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error('Migrations copilot non appliquées : exécute supabase/migrations/20260331130000_copilot_memory_system.sql')
    }
    throw new Error(error.message)
  }
  return mapMemoryRow(data as Record<string, unknown>)
}

export async function listActiveSignals(
  supabase: SupabaseClient,
  userId: string,
  limit = 12
): Promise<CopilotBehaviorSignalRow[]> {
  const { data, error } = await supabase
    .from('copilot_behavior_signals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('detected_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      signal_type: String(r.signal_type),
      severity: r.severity as CopilotBehaviorSignalRow['severity'],
      description: String(r.description),
      supporting_data: asRecord(r.supporting_data),
      detected_at: String(r.detected_at),
      is_active: Boolean(r.is_active),
    }
  })
}

export async function hasRecentActiveSignal(
  supabase: SupabaseClient,
  userId: string,
  signalType: string,
  withinDays: number
): Promise<boolean> {
  const since = new Date()
  since.setDate(since.getDate() - withinDays)
  const { count, error } = await supabase
    .from('copilot_behavior_signals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('signal_type', signalType)
    .eq('is_active', true)
    .gte('detected_at', since.toISOString())
  if (error) {
    if (isMissingRelationError(error)) return false
    throw new Error(error.message)
  }
  return (count ?? 0) > 0
}

export async function insertBehaviorSignal(
  supabase: SupabaseClient,
  input: {
    userId: string
    signalType: string
    severity: CopilotBehaviorSignalRow['severity']
    description: string
    supportingData?: Record<string, unknown>
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('copilot_behavior_signals')
    .insert({
      user_id: input.userId,
      signal_type: input.signalType,
      severity: input.severity,
      description: input.description,
      supporting_data: input.supportingData ?? {},
      detected_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id')
    .single()
  if (error) {
    if (isMissingRelationError(error)) return ''
    throw new Error(error.message)
  }
  return String((data as { id: string }).id)
}

export async function fetchRecommendationStats(
  supabase: SupabaseClient,
  userId: string
): Promise<RecommendationStatusStats> {
  const { data, error } = await supabase
    .from('assistant_recommendations')
    .select('status')
    .eq('user_id', userId)
  if (error) {
    if (isMissingRelationError(error)) {
      return { open: 0, accepted: 0, dismissed: 0, done: 0 }
    }
    throw new Error(error.message)
  }
  const stats: RecommendationStatusStats = { open: 0, accepted: 0, dismissed: 0, done: 0 }
  for (const row of data ?? []) {
    const s = (row as { status: string }).status
    if (s === 'open') stats.open++
    else if (s === 'accepted') stats.accepted++
    else if (s === 'dismissed') stats.dismissed++
    else if (s === 'done') stats.done++
  }
  return stats
}

export async function fetchOpenRecommendationsPreview(
  supabase: SupabaseClient,
  userId: string,
  limit = 8
): Promise<{ id: string; title: string; severity: string }[]> {
  const { data, error } = await supabase
    .from('assistant_recommendations')
    .select('id, title, severity')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []).map((r) => ({
    id: String((r as { id: string }).id),
    title: String((r as { title: string }).title),
    severity: String((r as { severity: string }).severity),
  }))
}

export async function insertFeedbackEvent(
  supabase: SupabaseClient,
  input: {
    userId: string
    feedbackType: CopilotFeedbackEventType
    conversationId?: string | null
    recommendationId?: string | null
    payload?: Record<string, unknown>
  }
): Promise<void> {
  const { error } = await supabase.from('copilot_feedback_events').insert({
    user_id: input.userId,
    conversation_id: input.conversationId ?? null,
    recommendation_id: input.recommendationId ?? null,
    feedback_type: input.feedbackType,
    payload: input.payload ?? {},
    created_at: new Date().toISOString(),
  })
  if (error) {
    if (isMissingRelationError(error)) return
    throw new Error(error.message)
  }
}

export async function listRecentFeedbackEvents(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<CopilotFeedbackEventRow[]> {
  const { data, error } = await supabase
    .from('copilot_feedback_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      conversation_id: r.conversation_id != null ? String(r.conversation_id) : null,
      recommendation_id: r.recommendation_id != null ? String(r.recommendation_id) : null,
      feedback_type: r.feedback_type as CopilotFeedbackEventRow['feedback_type'],
      payload: asRecord(r.payload),
      created_at: String(r.created_at),
    }
  })
}

function mapDecisionRow(r: Record<string, unknown>): CopilotDecisionRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    recommendation_id: String(r.recommendation_id),
    conversation_id: r.conversation_id != null ? String(r.conversation_id) : null,
    decision_type: r.decision_type as CopilotDecisionType,
    decided_at: String(r.decided_at),
    executed: Boolean(r.executed),
    executed_at: r.executed_at != null ? String(r.executed_at) : null,
    delay_days: r.delay_days != null ? Number(r.delay_days) : null,
    notes: r.notes != null ? String(r.notes) : null,
    metadata: asRecord(r.metadata),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

export async function insertCopilotDecision(
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
  if (input.decisionType === 'accepted') {
    const pending = await findLatestAcceptedDecisionForRecommendation(
      supabase,
      input.userId,
      input.recommendationId
    )
    if (pending) return pending
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('copilot_decisions')
    .insert({
      user_id: input.userId,
      recommendation_id: input.recommendationId,
      conversation_id: input.conversationId,
      decision_type: input.decisionType,
      decided_at: now,
      executed: false,
      executed_at: null,
      delay_days: null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()
  if (error) {
    if (isMissingRelationError(error)) return null
    if ((error as { code?: string }).code === '23505' && input.decisionType === 'accepted') {
      const fallback = await findLatestAcceptedDecisionForRecommendation(
        supabase,
        input.userId,
        input.recommendationId
      )
      if (fallback) return fallback
    }
    throw new Error(error.message)
  }
  return mapDecisionRow(data as Record<string, unknown>)
}

export async function listCopilotDecisionsRecent(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<CopilotDecisionRow[]> {
  const { data, error } = await supabase
    .from('copilot_decisions')
    .select('*')
    .eq('user_id', userId)
    .order('decided_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []).map((row) => mapDecisionRow(row as Record<string, unknown>))
}

export async function findLatestAcceptedDecisionForRecommendation(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string
): Promise<CopilotDecisionRow | null> {
  const { data, error } = await supabase
    .from('copilot_decisions')
    .select('*')
    .eq('user_id', userId)
    .eq('recommendation_id', recommendationId)
    .eq('decision_type', 'accepted')
    .eq('executed', false)
    .order('decided_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    if (isMissingRelationError(error)) return null
    throw new Error(error.message)
  }
  if (!data) return null
  return mapDecisionRow(data as Record<string, unknown>)
}

export async function updateCopilotDecisionExecutedById(
  supabase: SupabaseClient,
  userId: string,
  decisionId: string,
  executedAtIso: string,
  delayDays: number | null
): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('copilot_decisions')
    .update({
      executed: true,
      executed_at: executedAtIso,
      delay_days: delayDays,
      updated_at: now,
    })
    .eq('id', decisionId)
    .eq('user_id', userId)
  if (error) {
    if (isMissingRelationError(error)) return false
    throw new Error(error.message)
  }
  return true
}

export async function insertAgentActionLog(
  supabase: SupabaseClient,
  input: {
    userId: string
    conversationId: string | null
    actionType: string
    payload: Record<string, unknown>
    resultStatus: CopilotAgentActionResultStatus
    resultMessage: string | null
    errorCode?: string | null
    errorCategory?: CopilotAgentErrorCategory | null
    retryable?: boolean | null
    auditMeta?: Record<string, unknown>
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from('copilot_agent_action_logs')
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      action_type: input.actionType,
      payload: input.payload,
      result_status: input.resultStatus,
      result_message: input.resultMessage,
      error_code: input.errorCode ?? null,
      error_category: input.errorCategory ?? null,
      retryable: input.retryable ?? null,
      audit_meta: input.auditMeta ?? {},
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) {
    if (isMissingRelationError(error)) return null
    throw new Error(error.message)
  }
  return String((data as { id: string }).id)
}

export async function listAgentActionLogsRecent(
  supabase: SupabaseClient,
  userId: string,
  limit = 40
): Promise<CopilotAgentActionLogRow[]> {
  const { data, error } = await supabase
    .from('copilot_agent_action_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      conversation_id: r.conversation_id != null ? String(r.conversation_id) : null,
      action_type: String(r.action_type),
      payload: asRecord(r.payload),
      result_status: r.result_status as CopilotAgentActionResultStatus,
      result_message: r.result_message != null ? String(r.result_message) : null,
      error_code: r.error_code != null ? String(r.error_code) : null,
      error_category: (r.error_category as CopilotAgentErrorCategory | null) ?? null,
      retryable: r.retryable != null ? Boolean(r.retryable) : null,
      audit_meta: asRecord(r.audit_meta),
      created_at: String(r.created_at),
    }
  })
}

export async function upsertDailyBriefingPayload(
  supabase: SupabaseClient,
  userId: string,
  briefingDate: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('copilot_daily_briefings').upsert(
    {
      user_id: userId,
      briefing_date: briefingDate,
      payload,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,briefing_date' }
  )
  if (error) {
    if (isMissingRelationError(error)) return
    throw new Error(error.message)
  }
}

export async function getDailyBriefingPayloadForDate(
  supabase: SupabaseClient,
  userId: string,
  briefingDate: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('copilot_daily_briefings')
    .select('payload')
    .eq('user_id', userId)
    .eq('briefing_date', briefingDate)
    .maybeSingle()
  if (error) {
    if (isMissingRelationError(error)) return null
    throw new Error(error.message)
  }
  if (!data) return null
  return asRecord((data as { payload: unknown }).payload)
}

export async function countUnreadCriticalNotifications(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'critical')
    .eq('is_read', false)
  if (error) {
    if (isMissingRelationError(error)) return 0
    throw new Error(error.message)
  }
  return count ?? 0
}

export async function countAcceptedRecommendationsNotDone(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('assistant_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'accepted')
  if (error) {
    if (isMissingRelationError(error)) return 0
    throw new Error(error.message)
  }
  return count ?? 0
}

export async function countCriticalOpenRecommendations(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('assistant_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'open')
    .eq('severity', 'critical')
  if (error) {
    if (isMissingRelationError(error)) return 0
    throw new Error(error.message)
  }
  return count ?? 0
}

export async function aggregateDecisionsLast30d(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accepted: number; rejected: number; postponed: number }> {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data, error } = await supabase
    .from('copilot_decisions')
    .select('decision_type')
    .eq('user_id', userId)
    .gte('decided_at', since.toISOString())
  if (error) {
    if (isMissingRelationError(error)) return { accepted: 0, rejected: 0, postponed: 0 }
    throw new Error(error.message)
  }
  const out = { accepted: 0, rejected: 0, postponed: 0 }
  for (const row of data ?? []) {
    const t = (row as { decision_type: string }).decision_type
    if (t === 'accepted') out.accepted++
    else if (t === 'rejected') out.rejected++
    else if (t === 'postponed') out.postponed++
  }
  return out
}

export async function averageExecutionDelayDays(
  supabase: SupabaseClient,
  userId: string,
  sampleLimit = 50
): Promise<number | null> {
  const { data, error } = await supabase
    .from('copilot_decisions')
    .select('delay_days')
    .eq('user_id', userId)
    .eq('executed', true)
    .eq('decision_type', 'accepted')
    .not('delay_days', 'is', null)
    .order('executed_at', { ascending: false })
    .limit(sampleLimit)
  if (error) {
    if (isMissingRelationError(error)) return null
    throw new Error(error.message)
  }
  const vals = (data ?? [])
    .map((r) => Number((r as { delay_days: number | null }).delay_days))
    .filter((n) => Number.isFinite(n) && n >= 0)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export async function countCopilotLinkedOverdueTasks(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to_user_id', userId)
    .in('linked_entity_type', ['copilot_agent', 'copilot_task'])
    .lte('due_date', today)
    .or('status.eq.todo,status.eq.in_progress')
  if (error) {
    if (isMissingRelationError(error)) return 0
    throw new Error(error.message)
  }
  return count ?? 0
}

