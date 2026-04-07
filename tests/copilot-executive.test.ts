import { describe, expect, it } from 'vitest'
import { computeDisciplineScore } from '@/features/copilot/discipline'
import { detectCrisisMode } from '@/features/copilot/crisis'
import { computeDecisionDelay } from '@/features/copilot/decisions'
import { copilotActionRequiresExplicitApproval } from '@/features/copilot/policies'
import { executeCopilotActions } from '@/features/copilot/executor'
import { copilotActionsPayloadSchema } from '@/features/copilot/schemas'
import type { CopilotFinancialSnapshot } from '@/features/copilot/types'

function testFinancialSnapshot(overrides: Partial<CopilotFinancialSnapshot>): CopilotFinancialSnapshot {
  return {
    asOf: '2026-01-01T00:00:00.000Z',
    baseCurrency: 'EUR',
    availableCash: null,
    totalOpenDebt: null,
    totalOverdueAmount: null,
    overdueCount: null,
    dueIn7Days: null,
    dueIn30Days: null,
    expectedInflows7Days: null,
    expectedInflows30Days: null,
    forecastNet7Days: null,
    forecastNet30Days: null,
    weakestEntity: null,
    criticalPayments: [],
    criticalReceivables: [],
    dataQuality: {
      hasCashData: true,
      hasDebtData: true,
      hasForecastData: true,
      hasReceivablesData: true,
    },
    sourceSummary: ['test'],
    fxIncomplete: false,
    criticalOverdueTasksCount: null,
    ...overrides,
  }
}

describe('computeDecisionDelay', () => {
  it('returns null if not executed', () => {
    expect(computeDecisionDelay('2026-01-01T00:00:00.000Z', null)).toBeNull()
  })

  it('returns full days between decided and executed', () => {
    expect(computeDecisionDelay('2026-01-01T00:00:00.000Z', '2026-01-05T00:00:00.000Z')).toBe(4)
  })
})

describe('computeDisciplineScore', () => {
  it('penalizes many open recommendations and rewards execution', () => {
    const low = computeDisciplineScore({
      recommendationStats: { open: 12, accepted: 2, dismissed: 1, done: 1 },
      openRecommendationsCount: 12,
      decisionsLast30d: { accepted: 1, rejected: 0, postponed: 6 },
      acceptedPendingExecutionCount: 4,
      averageExecutionDelayDays: 14,
      criticalSignalsCount: 2,
      postponedLast30d: 6,
      copilotOverdueTasksCount: 2,
    })
    expect(low.score).toBeLessThan(55)

    const high = computeDisciplineScore({
      recommendationStats: { open: 1, accepted: 4, dismissed: 0, done: 4 },
      openRecommendationsCount: 1,
      decisionsLast30d: { accepted: 3, rejected: 1, postponed: 0 },
      acceptedPendingExecutionCount: 0,
      averageExecutionDelayDays: 2,
      criticalSignalsCount: 0,
      postponedLast30d: 0,
      copilotOverdueTasksCount: 0,
    })
    expect(high.score).toBeGreaterThan(60)
  })
})

describe('detectCrisisMode', () => {
  it('flags critical when cash cannot cover overdue and alerts stack', () => {
    const r = detectCrisisMode({
      financial: testFinancialSnapshot({
        availableCash: 1000,
        totalOverdueAmount: 50000,
        overdueCount: 5,
        totalOpenDebt: 80000,
      }),
      criticalAlertsUnread: 3,
      criticalSignalsCount: 2,
      cashStressSignalRecurrent: true,
      criticalOpenRecommendationsCount: 1,
      acceptedNotExecutedCount: 5,
      disciplineScore: 30,
      postponedDecisionsLast30d: 6,
    })
    expect(r.isCrisisMode).toBe(true)
    expect(['high', 'critical']).toContain(r.severity)
  })

  it('stays normal with healthy inputs', () => {
    const r = detectCrisisMode({
      financial: testFinancialSnapshot({
        availableCash: 100000,
        totalOverdueAmount: 1000,
        overdueCount: 0,
        totalOpenDebt: 5000,
      }),
      criticalAlertsUnread: 0,
      criticalSignalsCount: 0,
      cashStressSignalRecurrent: false,
      criticalOpenRecommendationsCount: 0,
      acceptedNotExecutedCount: 0,
      disciplineScore: 72,
      postponedDecisionsLast30d: 0,
    })
    expect(r.severity).toBe('normal')
    expect(r.isCrisisMode).toBe(false)
  })
})

describe('policies + executor', () => {
  it('classifies sensitive vs self-service actions', () => {
    expect(copilotActionRequiresExplicitApproval('send_email')).toBe(true)
    expect(copilotActionRequiresExplicitApproval('create_task')).toBe(false)
  })

  it('parses a valid actions payload', () => {
    const parsed = copilotActionsPayloadSchema.safeParse([
      { type: 'create_task', title: 'T1', priority: 'high' },
      { type: 'log_agent_action', label: 'test' },
    ])
    expect(parsed.success).toBe(true)
  })

  it('blocks sensitive actions without explicit approval', async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'log-1' }, error: null }),
          }),
        }),
      }),
    } as never

    const res = await executeCopilotActions({
      supabase,
      userId: 'u1',
      conversationId: null,
      actions: [{ type: 'send_email', to: 'a@b.c', subject: 'S', body: 'B' }],
      policyContext: {
        scopeType: 'global',
        companyIds: [],
        explicitApproval: false,
      },
    })
    expect(res.results[0]?.status).toBe('blocked')
  })
})
