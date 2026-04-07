/**
 * Types métier du copilote (mémoire explicite, profil, signaux).
 * Les conversations restent `assistant_*` côté base.
 */

export type CopilotMemoryType =
  | 'preference'
  | 'habit'
  | 'operational'
  | 'decision_pattern'
  | 'topic'
  | 'risk_note'
  | 'explicit_user'

export type CopilotSignalSeverity = 'info' | 'warning' | 'attention'

export type CopilotFeedbackEventType =
  | 'recommendation_accepted'
  | 'recommendation_dismissed'
  | 'recommendation_done'
  | 'memory_created'
  | 'memory_updated'
  | 'memory_deactivated'
  | 'profile_updated'
  | 'signal_acknowledged'
  | 'other'

export interface CopilotUserProfileRow {
  user_id: string
  preferred_tone: string | null
  preferred_output_style: string | null
  dominant_focus: string | null
  estimated_risk_tolerance: string | null
  decision_style: string | null
  recurring_topics: string[]
  recurring_biases: string[]
  strong_patterns: string[]
  last_profile_update_at: string | null
  profile_summary: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CopilotMemoryItemRow {
  id: string
  user_id: string
  memory_type: CopilotMemoryType
  key: string
  value_json: Record<string, unknown>
  confidence_score: number
  source_count: number
  first_seen_at: string
  last_seen_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CopilotBehaviorSignalRow {
  id: string
  user_id: string
  signal_type: string
  severity: CopilotSignalSeverity
  description: string
  supporting_data: Record<string, unknown>
  detected_at: string
  is_active: boolean
}

export interface CopilotFeedbackEventRow {
  id: string
  user_id: string
  conversation_id: string | null
  recommendation_id: string | null
  feedback_type: CopilotFeedbackEventType
  payload: Record<string, unknown>
  created_at: string
}

/** Agrégats explicites (pas d’inférence LLM ici). */
export interface RecommendationStatusStats {
  open: number
  accepted: number
  dismissed: number
  done: number
}

/** Contexte compact injecté dans le prompt système. */
export interface CopilotEnrichedContext {
  profile: CopilotUserProfileRow | null
  /** Mémoire structurée pertinente pour la requête courante. */
  memoryItems: CopilotMemoryItemRow[]
  /** Signaux actifs récents. */
  behaviorSignals: CopilotBehaviorSignalRow[]
  /** Recommandations encore ouvertes (aperçu). */
  openRecommendations: { id: string; title: string; severity: string }[]
  recommendationStats: RecommendationStatusStats
  /** Résumé très court du fil (derniers tours). */
  recentThreadSummary: string | null
  /** Métadonnées pour transparence UI. */
  meta: {
    memoryItemIdsUsed: string[]
    signalIdsUsed: string[]
    relevanceNote: string
  }
  /** Pilotage exécutif : discipline, crise, briefing (si chargé). */
  executive?: CopilotExecutiveSnapshot
}

// ---------------------------------------------------------------------------
// Couche exécution / pilotage
// ---------------------------------------------------------------------------

export type CopilotDecisionType = 'accepted' | 'rejected' | 'postponed'

export interface CopilotDecisionRow {
  id: string
  user_id: string
  recommendation_id: string
  conversation_id: string | null
  decision_type: CopilotDecisionType
  decided_at: string
  executed: boolean
  executed_at: string | null
  delay_days: number | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CopilotAgentActionResultStatus = 'success' | 'skipped' | 'blocked' | 'error'

export type CopilotAgentErrorCategory =
  | 'validation'
  | 'policy'
  | 'permission'
  | 'database'
  | 'integration'
  | 'unknown'

export interface CopilotAgentActionLogRow {
  id: string
  user_id: string
  conversation_id: string | null
  action_type: string
  payload: Record<string, unknown>
  result_status: CopilotAgentActionResultStatus
  result_message: string | null
  error_code: string | null
  error_category: CopilotAgentErrorCategory | null
  retryable: boolean | null
  audit_meta: Record<string, unknown>
  created_at: string
}

export type CopilotActionType =
  | 'create_task'
  | 'create_alert'
  | 'create_recommendation'
  | 'create_sprint_item'
  | 'log_agent_action'
  | 'send_email'
  | 'mark_payment_done'
  | 'close_debt'
  | 'delete_record'
  | 'transfer_money'
  | 'modify_financial_record'

export interface ExecutorPolicyContext {
  scopeType: 'global' | 'business' | 'personal'
  companyIds: string[]
  /** Si true, les actions sensibles peuvent être exécutées (garde-fou rare ; tests / flux futur). */
  explicitApproval?: boolean
}

export interface CopilotActionResultItem {
  index: number
  actionType: CopilotActionType
  status: CopilotAgentActionResultStatus
  message: string
  detail?: Record<string, unknown>
  errorCode?: string
  errorCategory?: CopilotAgentErrorCategory
  retryable?: boolean
}

export interface ExecuteCopilotActionsResult {
  results: CopilotActionResultItem[]
}

export type DisciplineLevel = 'low' | 'unstable' | 'solid' | 'strong'

export interface DisciplineFactor {
  /** Contribution normalisée (approx. -1 à +1) sur le score global. */
  contribution: number
  label: string
}

export interface DisciplineScoreResult {
  score: number
  level: DisciplineLevel
  execution_score: number
  responsiveness_score: number
  focus_score: number
  followthrough_score: number
  insights: string[]
  /** Décomposition lisible pour un dirigeant. */
  factors: Record<string, DisciplineFactor>
}

export interface DisciplineScoreInput {
  recommendationStats: RecommendationStatusStats
  openRecommendationsCount: number
  decisionsLast30d: { accepted: number; rejected: number; postponed: number }
  /** Recos au statut `accepted` mais pas encore `done`. */
  acceptedPendingExecutionCount: number
  averageExecutionDelayDays: number | null
  criticalSignalsCount: number
  postponedLast30d: number
  copilotOverdueTasksCount: number
}

export type CrisisSeverity = 'normal' | 'elevated' | 'high' | 'critical'

export type CrisisRecommendedPosture =
  | 'cash_first'
  | 'stabilize_operations'
  | 'reduce_outflows'
  | 'decide_now'
  | 'maintain_course'

export interface CrisisModeResult {
  isCrisisMode: boolean
  severity: CrisisSeverity
  reasons: string[]
  /** Poids explicites (règle → points). */
  scoreBreakdown: Record<string, number>
  scoreTotal: number
  dominantRisk: string
  recommendedPosture: CrisisRecommendedPosture
}

export interface CrisisModeInput {
  financial: CopilotFinancialSnapshot
  criticalAlertsUnread: number
  criticalSignalsCount: number
  cashStressSignalRecurrent: boolean
  criticalOpenRecommendationsCount: number
  acceptedNotExecutedCount: number
  disciplineScore: number
  postponedDecisionsLast30d: number
}

/** @deprecated Préférer CopilotFinancialSnapshot ; conservé pour compat. */
export interface FinancialSnapshotBrief {
  totalCash: number
  totalOverdue: number
  overdueCount: number
  totalOpenDebt: number
  totalRevenueExpected: number
  companiesCount: number
  baseCurrency: string
}

export interface CopilotFinancialCriticalPayment {
  id: string
  label: string
  amount: number
  dueDate: string | null
  entityName: string | null
  companyId: string
}

export interface CopilotFinancialCriticalReceivable {
  id: string
  label: string
  amount: number
  expectedDate: string | null
  entityName: string | null
  companyId: string
}

/**
 * Snapshot normalisé pour le copilote — aligné sur les vues/métier existants (accounts_with_balance, debts_with_remaining, revenues).
 * Les montants agrégés sont en devise de consolidation (baseCurrency) lorsque le FX est disponible.
 */
export interface CopilotFinancialSnapshot {
  asOf: string
  baseCurrency: string
  availableCash: number | null
  totalOpenDebt: number | null
  totalOverdueAmount: number | null
  overdueCount: number | null
  /** Sorties dettes (échéances) sur la fenêtre — même périmètre que la prévision module forecast (dettes dues). */
  dueIn7Days: number | null
  dueIn30Days: number | null
  /** Encaissements attendus (reliquat revenus) sur la fenêtre. */
  expectedInflows7Days: number | null
  expectedInflows30Days: number | null
  /** inflows − outflows (dettes dues) sur la fenêtre ; hors récurrence simulée mensuelle. */
  forecastNet7Days: number | null
  forecastNet30Days: number | null
  weakestEntity: { id: string; name: string; reason: string } | null
  criticalPayments: CopilotFinancialCriticalPayment[]
  criticalReceivables: CopilotFinancialCriticalReceivable[]
  dataQuality: {
    hasCashData: boolean
    hasDebtData: boolean
    hasForecastData: boolean
    hasReceivablesData: boolean
  }
  sourceSummary: string[]
  /** Si au moins une conversion de devise vers la base a échoué. */
  fxIncomplete: boolean
  /** Tâches critiques en retard (priorité critical, statut ouvert). */
  criticalOverdueTasksCount: number | null
}

export type DailyBriefingRiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface DailyBriefingPayload {
  /** Version du schéma (cache SQL). */
  payloadVersion: number
  overallRiskLevel: DailyBriefingRiskLevel
  headline: string
  mainRisk: string
  weakestEntity: { id: string; name: string; reason: string } | null
  decisionOfTheDay: string
  topActions: string[]
  watchItems: string[]
  financialHighlights: string[]
  disciplineSummary: string
  crisisMode: CrisisModeResult
  discipline: DisciplineScoreResult
  generatedAt: string
  baseCurrency: string
  sourceSummary: string[]
  /** Snapshot financier utilisé (référence ; pas de dump brut). */
  financialSnapshot: CopilotFinancialSnapshot
}

export interface CopilotExecutiveSnapshot {
  discipline: DisciplineScoreResult
  crisis: CrisisModeResult
  briefing: DailyBriefingPayload | null
}
