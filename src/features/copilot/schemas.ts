import { z } from 'zod'

export const copilotMemoryTypeSchema = z.enum([
  'preference',
  'habit',
  'operational',
  'decision_pattern',
  'topic',
  'risk_note',
  'explicit_user',
])

export const copilotUserProfileUpdateSchema = z.object({
  preferred_tone: z.string().max(500).nullable().optional(),
  preferred_output_style: z.string().max(500).nullable().optional(),
  dominant_focus: z.string().max(200).nullable().optional(),
  estimated_risk_tolerance: z.string().max(200).nullable().optional(),
  decision_style: z.string().max(500).nullable().optional(),
  recurring_topics: z.array(z.string().max(200)).max(50).optional(),
  recurring_biases: z.array(z.string().max(300)).max(50).optional(),
  strong_patterns: z.array(z.string().max(300)).max(50).optional(),
  profile_summary: z.string().max(4000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const copilotMemoryItemUpsertSchema = z.object({
  memory_type: copilotMemoryTypeSchema,
  key: z.string().min(1).max(200),
  value_json: z.record(z.string(), z.unknown()),
  confidence_score: z.number().min(0).max(1).optional(),
})

export const copilotFeedbackEventTypeSchema = z.enum([
  'recommendation_accepted',
  'recommendation_dismissed',
  'recommendation_done',
  'memory_created',
  'memory_updated',
  'memory_deactivated',
  'profile_updated',
  'signal_acknowledged',
  'other',
])

export type CopilotUserProfileUpdate = z.infer<typeof copilotUserProfileUpdateSchema>
export type CopilotMemoryItemUpsert = z.infer<typeof copilotMemoryItemUpsertSchema>

const taskPrioritySchema = z.enum(['low', 'normal', 'high', 'critical'])

export const copilotActionCreateTaskSchema = z.object({
  type: z.literal('create_task'),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: taskPrioritySchema.optional(),
  companyId: z.string().uuid().optional(),
})

export const copilotActionCreateAlertSchema = z.object({
  type: z.literal('create_alert'),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(4000),
  alertType: z.string().min(1).max(120),
  severity: z.enum(['info', 'warning', 'critical']),
  companyId: z.string().uuid().optional(),
})

export const copilotActionCreateRecommendationSchema = z.object({
  type: z.literal('create_recommendation'),
  title: z.string().min(1).max(500),
  body: z.string().max(4000).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  recommendationType: z.string().min(1).max(120),
  conversationId: z.string().uuid().optional(),
})

export const copilotActionCreateSprintItemSchema = z.object({
  type: z.literal('create_sprint_item'),
  sprintId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: taskPrioritySchema.optional(),
  companyId: z.string().uuid().optional(),
})

export const copilotActionLogAgentActionSchema = z.object({
  type: z.literal('log_agent_action'),
  label: z.string().min(1).max(500),
  detail: z.record(z.string(), z.unknown()).optional(),
})

const sensitiveActionBase = {
  send_email: z.object({
    type: z.literal('send_email'),
    to: z.string().min(1).max(500),
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(8000),
  }),
  mark_payment_done: z.object({
    type: z.literal('mark_payment_done'),
    paymentId: z.string().uuid(),
  }),
  close_debt: z.object({
    type: z.literal('close_debt'),
    debtId: z.string().uuid(),
  }),
  delete_record: z.object({
    type: z.literal('delete_record'),
    tableHint: z.string().min(1).max(120),
    recordId: z.string().uuid(),
  }),
  transfer_money: z.object({
    type: z.literal('transfer_money'),
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().min(3).max(3),
  }),
  modify_financial_record: z.object({
    type: z.literal('modify_financial_record'),
    entityType: z.string().min(1).max(120),
    recordId: z.string().uuid(),
    patch: z.record(z.string(), z.unknown()),
  }),
} as const

export const copilotActionSchema = z.discriminatedUnion('type', [
  copilotActionCreateTaskSchema,
  copilotActionCreateAlertSchema,
  copilotActionCreateRecommendationSchema,
  copilotActionCreateSprintItemSchema,
  copilotActionLogAgentActionSchema,
  sensitiveActionBase.send_email,
  sensitiveActionBase.mark_payment_done,
  sensitiveActionBase.close_debt,
  sensitiveActionBase.delete_record,
  sensitiveActionBase.transfer_money,
  sensitiveActionBase.modify_financial_record,
])

export const copilotActionsPayloadSchema = z.array(copilotActionSchema)

export type CopilotActionPayload = z.infer<typeof copilotActionSchema>
