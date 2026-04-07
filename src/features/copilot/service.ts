/**
 * Point d’entrée public du module copilote (hors UI).
 */

export { buildCopilotContext, serializeCopilotContext } from './context'
export { runControlledLearningAggregate } from './learning'
export {
  COPILOT_CONSTRUCTIVE_CHALLENGE_BLOCK,
  COPILOT_CRISIS_MODE_BLOCK,
  COPILOT_DISCIPLINE_BLOCK,
  COPILOT_EXECUTION_BLOCK,
  formatCopilotContextForPrompt,
  formatExecutiveCopilotBlocks,
  formatExecutiveCopilotContextForPrompt,
} from './prompts'
export { generateDailyBriefing } from './briefing'
export { computeDisciplineScore, buildDisciplineInsights } from './discipline'
export { detectCrisisMode } from './crisis'
export {
  createDecision,
  markDecisionExecuted,
  listRecentDecisions,
  computeDecisionDelay,
} from './decisions'
export { executeCopilotActions } from './executor'
export {
  copilotActionRequiresExplicitApproval,
  COPILOT_SELF_SERVICE_ACTION_TYPES,
  COPILOT_SENSITIVE_ACTION_TYPES,
} from './policies'
