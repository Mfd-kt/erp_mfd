export type AssistantScopeType = 'global' | 'business' | 'personal'
export type AssistantConversationStatus = 'active' | 'archived'
export type AssistantMessageRole = 'user' | 'assistant' | 'system'
export type AssistantMemorySource = 'explicit_feedback' | 'behavior' | 'system_rule'
export type AssistantRecommendationStatus = 'open' | 'accepted' | 'dismissed' | 'done'
export type AssistantRecommendationSeverity = 'info' | 'warning' | 'critical'
export type AssistantRunTrigger = 'daily_digest' | 'chat' | 'manual_review' | 'scheduled'
export type AssistantRunStatus = 'pending' | 'completed' | 'failed'

export interface AssistantConversation {
  id: string
  user_id: string
  scope_type: AssistantScopeType
  company_id: string | null
  title: string
  summary: string | null
  status: AssistantConversationStatus
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export interface AssistantMessage {
  id: string
  conversation_id: string
  role: AssistantMessageRole
  content: string
  metadata_json: Record<string, unknown> | null
  created_at: string
}

export interface AssistantMemory {
  id: string
  user_id: string
  key: string
  value_json: Record<string, unknown>
  confidence: number
  source: AssistantMemorySource
  created_at: string
  updated_at: string
}

export interface AssistantRecommendation {
  id: string
  user_id: string
  company_id: string | null
  scope_type: AssistantScopeType
  recommendation_type: string
  severity: AssistantRecommendationSeverity
  title: string
  body: string | null
  status: AssistantRecommendationStatus
  linked_entity_type: string | null
  linked_entity_id: string | null
  created_at: string
  updated_at: string
}

export interface AssistantRun {
  id: string
  user_id: string
  trigger_type: AssistantRunTrigger
  status: AssistantRunStatus
  summary: string | null
  metadata_json: Record<string, unknown> | null
  created_at: string
  completed_at: string | null
}

export interface AssistantContext {
  userId: string
  scopeType: AssistantScopeType
  companyId: string | null
  companyIds: string[]
  companies: { id: string; legal_name: string; trade_name: string | null; default_currency: string }[]
  groupBaseCurrency?: string
  groupId?: string | null
  /** When set (e.g. cron), use this instead of createClient() */
  supabase?: import('@supabase/supabase-js').SupabaseClient
}
