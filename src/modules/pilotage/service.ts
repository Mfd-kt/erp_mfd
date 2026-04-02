import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AcquisitionMetricsResult,
  BreakEvenInput,
  BreakEvenResult,
  ClientAcquisitionInput,
  ClientAcquisitionRow,
  CompanyPilotageData,
  CompanyPilotageParams,
  DebtTypeAxisCode,
  PilotageAssumption,
  PilotageAlert,
  PilotageAlertThresholds,
  ProjectMarginInput,
  ProjectMarginResult,
  ProjectMarginRow,
  ProjectRevenuePoint,
  TreasuryNeedInput,
  TreasuryNeedResult,
} from './types'

function toNumber(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function safeDivide(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null
  return num / den
}

function normalizeAxisCode(raw: string | null | undefined): DebtTypeAxisCode {
  const code = (raw ?? '').toUpperCase().trim()
  if (code.startsWith('OPEX')) return 'OPEX'
  if (code.startsWith('PROD')) return 'PROD'
  if (code.startsWith('ACQ')) return 'ACQ'
  if (code.startsWith('FIN')) return 'FIN'
  return 'OTHER'
}

function normalizeProjectKey(sourceName: string | null, title: string): string {
  const normalized = (sourceName ?? '').trim()
  if (normalized.length > 0) return normalized
  const fallback = title.trim()
  return fallback.length > 0 ? fallback : 'Sans chantier'
}

function normalizeClientKey(clientName: string | null, sourceName: string | null): string {
  const a = (clientName ?? '').trim()
  if (a.length > 0) return a
  const b = (sourceName ?? '').trim()
  if (b.length > 0) return b
  return 'Sans client'
}

const DEFAULT_ALERT_THRESHOLDS: PilotageAlertThresholds = {
  minRealizedMarginRateWarning: 0.1,
  minRealizedMarginRateCritical: 0,
  maxAcquisitionCostRatioWarning: 0.35,
  maxAcquisitionCostRatioCritical: 0.5,
  minSafetyMarginWarning: 0,
  minSafetyMarginCritical: -5000,
  maxTreasuryNeedWarning: 0,
  maxTreasuryNeedCritical: 10000,
}

/**
 * Compute margin by chantier/project using proportional allocation of production costs.
 * This is a controlled approximation until explicit project links exist on debts/payments.
 */
export function computeProjectMargin(input: ProjectMarginInput): ProjectMarginResult {
  const totalProductionCosts = Math.max(0, toNumber(input.totalProductionCosts))
  const rowsSeed = input.projects.map((p) => ({
    projectKey: p.projectKey,
    revenueExpected: Math.max(0, toNumber(p.revenueExpected)),
    revenueReceived: Math.max(0, toNumber(p.revenueReceived)),
  }))
  const totalExpected = rowsSeed.reduce((s, r) => s + r.revenueExpected, 0)
  const totalReceived = rowsSeed.reduce((s, r) => s + r.revenueReceived, 0)

  const rows: ProjectMarginRow[] = rowsSeed.map((r) => {
    const share = safeDivide(r.revenueExpected, totalExpected) ?? 0
    const allocated = totalProductionCosts * share
    const grossExpected = r.revenueExpected - allocated
    const grossRealized = r.revenueReceived - allocated
    return {
      projectKey: r.projectKey,
      revenueExpected: r.revenueExpected,
      revenueReceived: r.revenueReceived,
      allocatedProductionCosts: allocated,
      grossMarginExpected: grossExpected,
      grossMarginRealized: grossRealized,
      marginRateRealized: safeDivide(grossRealized, r.revenueReceived),
    }
  })

  rows.sort((a, b) => b.revenueExpected - a.revenueExpected)

  const assumptions: PilotageAssumption[] = [
    {
      id: 'project_allocation_expected_share',
      label: 'Allocation proportionnelle des coûts PROD',
      description:
        'Les coûts de production sont ventilés selon la part de revenu attendu par chantier.',
      impact: 'high',
    },
    {
      id: 'project_key_from_revenue',
      label: 'Clé chantier dérivée du revenu',
      description: 'Le chantier est déduit de source_name (ou du titre de revenu si vide).',
      impact: 'medium',
    },
  ]

  return {
    rows,
    totalRevenueExpected: totalExpected,
    totalRevenueReceived: totalReceived,
    totalAllocatedProductionCosts: totalProductionCosts,
    totalGrossMarginExpected: totalExpected - totalProductionCosts,
    totalGrossMarginRealized: totalReceived - totalProductionCosts,
    assumptions,
  }
}

/**
 * Compute client cost metrics using proportional allocation of acquisition costs.
 */
export function computeAcquisitionMetrics(input: ClientAcquisitionInput): AcquisitionMetricsResult {
  const totalAcquisitionCosts = Math.max(0, toNumber(input.totalAcquisitionCosts))
  const clients = input.clients.map((c) => ({
    clientKey: c.clientKey,
    revenueExpected: Math.max(0, toNumber(c.revenueExpected)),
    revenueReceived: Math.max(0, toNumber(c.revenueReceived)),
  }))
  const totalExpected = clients.reduce((s, c) => s + c.revenueExpected, 0)

  const rows: ClientAcquisitionRow[] = clients.map((c) => {
    const share = safeDivide(c.revenueExpected, totalExpected) ?? 0
    const allocated = totalAcquisitionCosts * share
    return {
      clientKey: c.clientKey,
      revenueExpected: c.revenueExpected,
      revenueReceived: c.revenueReceived,
      allocatedAcquisitionCost: allocated,
      realizedCostRatio: safeDivide(allocated, c.revenueReceived),
    }
  })
  rows.sort((a, b) => b.revenueExpected - a.revenueExpected)

  const activeClientsCount = rows.filter((r) => r.revenueExpected > 0 || r.revenueReceived > 0).length
  const customerAcquisitionCost =
    activeClientsCount > 0 ? totalAcquisitionCosts / activeClientsCount : null

  const ratios = rows.map((r) => r.realizedCostRatio).filter((v): v is number => v != null)
  const averageRealizedCostRatio =
    ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : null

  const assumptions: PilotageAssumption[] = [
    {
      id: 'acq_cost_allocation_expected_share',
      label: 'Répartition ACQ par part de revenu attendu',
      description:
        "Les coûts d'acquisition sont ventilés entre clients selon la part de revenu attendu.",
      impact: 'high',
    },
    {
      id: 'cac_active_clients',
      label: 'CAC simplifié',
      description: 'CAC = coût ACQ total / nombre de clients actifs sur la période.',
      impact: 'medium',
    },
  ]

  return {
    rows,
    totalAcquisitionCosts,
    activeClientsCount,
    customerAcquisitionCost,
    averageRealizedCostRatio,
    assumptions,
  }
}

/**
 * Compute break-even from fixed/variable split and realized revenue.
 */
export function computeBreakEven(input: BreakEvenInput): BreakEvenResult {
  const realizedRevenue = Math.max(0, toNumber(input.realizedRevenue))
  const fixedCosts = Math.max(0, toNumber(input.fixedCosts))
  const variableCosts = Math.max(0, toNumber(input.variableCosts))
  const contributionMargin = realizedRevenue - variableCosts
  const contributionMarginRate = safeDivide(contributionMargin, realizedRevenue)

  const breakEvenRevenue =
    contributionMarginRate != null && contributionMarginRate > 0
      ? fixedCosts / contributionMarginRate
      : null
  const safetyMargin = breakEvenRevenue != null ? realizedRevenue - breakEvenRevenue : null

  const assumptions: PilotageAssumption[] = [
    {
      id: 'fixed_costs_opex_fin',
      label: 'Charges fixes = OPEX + FIN',
      description: 'Le modèle considère OPEX/FIN comme charges majoritairement fixes.',
      impact: 'medium',
    },
    {
      id: 'variable_costs_prod_acq',
      label: 'Charges variables = PROD + ACQ',
      description: 'Le modèle considère PROD/ACQ comme charges variables liées au volume.',
      impact: 'medium',
    },
  ]

  return {
    fixedCosts,
    variableCosts,
    realizedRevenue,
    contributionMargin,
    contributionMarginRate,
    breakEvenRevenue,
    safetyMargin,
    assumptions,
  }
}

/**
 * Compute treasury need over a horizon using opening cash + expected inflows/outflows.
 */
export function computeTreasuryNeed(input: TreasuryNeedInput): TreasuryNeedResult {
  const openingCash = toNumber(input.openingCash)
  const expectedInflows = Math.max(0, toNumber(input.expectedInflows))
  const expectedOutflows = Math.max(0, toNumber(input.expectedOutflows))
  const horizonDays = Math.max(1, Math.floor(toNumber(input.horizonDays)))

  const projectedNet = openingCash + expectedInflows - expectedOutflows
  const treasuryNeed = Math.max(0, -projectedNet)
  const averageDailyOutflows = expectedOutflows / horizonDays
  const coverageDays =
    averageDailyOutflows > 0 ? (openingCash + expectedInflows) / averageDailyOutflows : null

  const assumptions: PilotageAssumption[] = [
    {
      id: 'treasury_horizon',
      label: `Horizon glissant ${horizonDays} jours`,
      description: "Le besoin est calculé sur l'horizon choisi avec projection simple d'encaissements/décaissements.",
      impact: 'low',
    },
  ]

  return {
    openingCash,
    expectedInflows,
    expectedOutflows,
    projectedNet,
    treasuryNeed,
    averageDailyOutflows,
    coverageDays,
    assumptions,
  }
}

export function computePilotageAlerts(
  projectMargin: ProjectMarginResult,
  acquisition: AcquisitionMetricsResult,
  breakEven: BreakEvenResult,
  treasuryNeed: TreasuryNeedResult,
  thresholds: PilotageAlertThresholds = DEFAULT_ALERT_THRESHOLDS
): PilotageAlert[] {
  const alerts: PilotageAlert[] = []

  const realizedMarginRate = safeDivide(
    projectMargin.totalGrossMarginRealized,
    projectMargin.totalRevenueReceived
  )
  if (realizedMarginRate != null && realizedMarginRate < thresholds.minRealizedMarginRateCritical) {
    alerts.push({
      id: 'margin_critical',
      axis: 'margin',
      severity: 'critical',
      title: 'Marge chantier critique',
      message: `La marge réalisée totale est négative (${(realizedMarginRate * 100).toFixed(1)}%).`,
    })
  } else if (realizedMarginRate != null && realizedMarginRate < thresholds.minRealizedMarginRateWarning) {
    alerts.push({
      id: 'margin_warning',
      axis: 'margin',
      severity: 'warning',
      title: 'Marge chantier faible',
      message: `La marge réalisée totale est basse (${(realizedMarginRate * 100).toFixed(1)}%).`,
    })
  }

  const acqRatio = acquisition.averageRealizedCostRatio
  if (acqRatio != null && acqRatio > thresholds.maxAcquisitionCostRatioCritical) {
    alerts.push({
      id: 'acq_critical',
      axis: 'client_cost',
      severity: 'critical',
      title: "Coût d'acquisition trop élevé",
      message: `Le ratio coût/revenu client moyen atteint ${(acqRatio * 100).toFixed(1)}%.`,
    })
  } else if (acqRatio != null && acqRatio > thresholds.maxAcquisitionCostRatioWarning) {
    alerts.push({
      id: 'acq_warning',
      axis: 'client_cost',
      severity: 'warning',
      title: "Coût d'acquisition sous tension",
      message: `Le ratio coût/revenu client moyen est de ${(acqRatio * 100).toFixed(1)}%.`,
    })
  }

  const safetyMargin = breakEven.safetyMargin
  if (safetyMargin != null && safetyMargin < thresholds.minSafetyMarginCritical) {
    alerts.push({
      id: 'break_even_critical',
      axis: 'break_even',
      severity: 'critical',
      title: 'Seuil de rentabilité non atteint',
      message: `Marge de sécurité négative (${safetyMargin.toFixed(0)}).`,
    })
  } else if (safetyMargin != null && safetyMargin < thresholds.minSafetyMarginWarning) {
    alerts.push({
      id: 'break_even_warning',
      axis: 'break_even',
      severity: 'warning',
      title: 'Seuil de rentabilité fragile',
      message: 'La marge de sécurité est nulle ou quasi nulle.',
    })
  }

  if (treasuryNeed.treasuryNeed > thresholds.maxTreasuryNeedCritical) {
    alerts.push({
      id: 'treasury_critical',
      axis: 'treasury',
      severity: 'critical',
      title: 'Besoin de trésorerie critique',
      message: `Le besoin projeté est de ${treasuryNeed.treasuryNeed.toFixed(0)}.`,
    })
  } else if (treasuryNeed.treasuryNeed > thresholds.maxTreasuryNeedWarning) {
    alerts.push({
      id: 'treasury_warning',
      axis: 'treasury',
      severity: 'warning',
      title: 'Besoin de trésorerie détecté',
      message: `Un besoin de ${treasuryNeed.treasuryNeed.toFixed(0)} est projeté.`,
    })
  }

  return alerts.sort((a, b) => {
    const rank = (s: string) => (s === 'critical' ? 3 : s === 'warning' ? 2 : 1)
    return rank(b.severity) - rank(a.severity)
  })
}

type RevenueAxisRow = {
  title: string
  source_name: string | null
  amount_expected: number
  amount_received: number
  expected_date: string
  received_date: string | null
  revenue_clients?: { name: string } | null
}

/** PostgREST embed fails if FK is missing or schema cache is stale; mirror revenues/queries fallback. */
function isRevenueClientRelationshipError(message: string) {
  return (
    message.includes("relationship between 'revenues' and 'revenue_clients'") ||
    message.includes('Could not find a relationship')
  )
}

type PaymentAxisRow = {
  amount_company_currency: number
  debts?: {
    debt_categories?: {
      debt_types?: {
        code?: string | null
      } | null
    } | null
  } | null
}

async function getOpeningCash(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data, error } = await supabase
    .from('accounts_with_balance')
    .select('computed_balance, opening_balance')
    .eq('company_id', companyId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return (data ?? []).reduce((sum, row) => {
    const r = row as { computed_balance?: number | null; opening_balance?: number | null }
    return sum + toNumber(r.computed_balance ?? r.opening_balance ?? 0)
  }, 0)
}

async function getRevenueAxisRows(
  supabase: SupabaseClient,
  companyId: string,
  from: string,
  to: string
): Promise<RevenueAxisRow[]> {
  const withJoin = supabase
    .from('revenues')
    .select('title, source_name, amount_expected, amount_received, expected_date, received_date, revenue_clients(name)')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .gte('expected_date', from)
    .lte('expected_date', to)

  let { data, error } = await withJoin
  if (error && isRevenueClientRelationshipError(error.message)) {
    const fb = await supabase
      .from('revenues')
      .select('title, source_name, amount_expected, amount_received, expected_date, received_date')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .gte('expected_date', from)
      .lte('expected_date', to)
    data = fb.data
    error = fb.error
  }
  if (error) throw new Error(error.message)
  return (data ?? []) as RevenueAxisRow[]
}

async function getPaymentAxisRows(
  supabase: SupabaseClient,
  companyId: string,
  from: string,
  to: string
): Promise<PaymentAxisRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount_company_currency, debts(debt_categories(debt_types(code)))')
    .eq('company_id', companyId)
    .gte('payment_date', from)
    .lte('payment_date', to)
  if (error) throw new Error(error.message)
  return (data ?? []) as PaymentAxisRow[]
}

async function getTreasuryFlows(
  supabase: SupabaseClient,
  companyId: string,
  horizonEndDate: string
): Promise<{ inflows: number; outflows: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: revenues, error: revenuesError }, { data: debts, error: debtsError }, { data: rules, error: rulesError }] =
    await Promise.all([
      supabase
        .from('revenues')
        .select('amount_expected, amount_received, expected_date')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('expected_date', today)
        .lte('expected_date', horizonEndDate),
      supabase
        .from('debts_with_remaining')
        .select('remaining_company_currency, due_date, computed_status')
        .eq('company_id', companyId)
        .not('computed_status', 'in', '("paid","cancelled")')
        .not('due_date', 'is', null)
        .lte('due_date', horizonEndDate),
      supabase
        .from('recurring_rules')
        .select('amount')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('auto_generate', true),
    ])
  if (revenuesError) throw new Error(revenuesError.message)
  if (debtsError) throw new Error(debtsError.message)
  if (rulesError) throw new Error(rulesError.message)

  const inflows = (revenues ?? []).reduce((sum, row) => {
    const r = row as { amount_expected?: number; amount_received?: number }
    const remaining = toNumber(r.amount_expected) - toNumber(r.amount_received)
    return sum + Math.max(0, remaining)
  }, 0)
  const debtOutflows = (debts ?? []).reduce((sum, row) => {
    const r = row as { remaining_company_currency?: number }
    return sum + Math.max(0, toNumber(r.remaining_company_currency))
  }, 0)

  const recurringMonthly = (rules ?? []).reduce((sum, row) => {
    const r = row as { amount?: number }
    return sum + Math.max(0, toNumber(r.amount))
  }, 0)
  const todayDate = new Date(today)
  const horizonDate = new Date(horizonEndDate)
  const horizonDays = Math.max(1, Math.floor((horizonDate.getTime() - todayDate.getTime()) / 86400000) + 1)
  const recurringOutflows = recurringMonthly * (horizonDays / 30)

  return {
    inflows,
    outflows: debtOutflows + recurringOutflows,
  }
}

export async function getCompanyPilotageData(params: CompanyPilotageParams): Promise<CompanyPilotageData> {
  const { supabase, companyId, currency, range } = params
  const horizonDays = Math.max(1, params.horizonDays ?? 30)

  const [revenues, payments, openingCash] = await Promise.all([
    getRevenueAxisRows(supabase, companyId, range.from, range.to),
    getPaymentAxisRows(supabase, companyId, range.from, range.to),
    getOpeningCash(supabase, companyId),
  ])

  const byProject = new Map<string, ProjectRevenuePoint>()
  const byClient = new Map<string, { clientKey: string; revenueExpected: number; revenueReceived: number }>()
  let realizedRevenue = 0

  for (const revenue of revenues) {
    const projectKey = normalizeProjectKey(revenue.source_name, revenue.title)
    const existingProject = byProject.get(projectKey) ?? {
      projectKey,
      revenueExpected: 0,
      revenueReceived: 0,
    }
    existingProject.revenueExpected += Math.max(0, toNumber(revenue.amount_expected))
    existingProject.revenueReceived += Math.max(0, toNumber(revenue.amount_received))
    byProject.set(projectKey, existingProject)

    const clientKey = normalizeClientKey(revenue.revenue_clients?.name ?? null, revenue.source_name)
    const existingClient = byClient.get(clientKey) ?? {
      clientKey,
      revenueExpected: 0,
      revenueReceived: 0,
    }
    existingClient.revenueExpected += Math.max(0, toNumber(revenue.amount_expected))
    existingClient.revenueReceived += Math.max(0, toNumber(revenue.amount_received))
    byClient.set(clientKey, existingClient)

    realizedRevenue += Math.max(0, toNumber(revenue.amount_received))
  }

  let totalProductionCosts = 0
  let totalAcquisitionCosts = 0
  let totalFixedCosts = 0
  let totalVariableCosts = 0

  for (const payment of payments) {
    const amount = Math.max(0, toNumber(payment.amount_company_currency))
    const code = normalizeAxisCode(payment.debts?.debt_categories?.debt_types?.code)
    if (code === 'PROD') totalProductionCosts += amount
    if (code === 'ACQ') totalAcquisitionCosts += amount
    if (code === 'OPEX' || code === 'FIN') totalFixedCosts += amount
    if (code === 'PROD' || code === 'ACQ') totalVariableCosts += amount
  }

  const projectMargin = computeProjectMargin({
    projects: Array.from(byProject.values()),
    totalProductionCosts,
  })

  const acquisition = computeAcquisitionMetrics({
    clients: Array.from(byClient.values()),
    totalAcquisitionCosts,
  })

  const breakEven = computeBreakEven({
    realizedRevenue,
    fixedCosts: totalFixedCosts,
    variableCosts: totalVariableCosts,
  })

  const today = new Date()
  const horizonDate = new Date(today)
  horizonDate.setDate(today.getDate() + horizonDays)
  const horizonEndDate = horizonDate.toISOString().slice(0, 10)
  const treasuryFlows = await getTreasuryFlows(supabase, companyId, horizonEndDate)
  const treasuryNeed = computeTreasuryNeed({
    openingCash,
    expectedInflows: treasuryFlows.inflows,
    expectedOutflows: treasuryFlows.outflows,
    horizonDays,
  })
  const thresholds = DEFAULT_ALERT_THRESHOLDS
  const alerts = computePilotageAlerts(
    projectMargin,
    acquisition,
    breakEven,
    treasuryNeed,
    thresholds
  )

  return {
    companyId,
    currency,
    range,
    projectMargin,
    acquisition,
    breakEven,
    treasuryNeed,
    alerts,
    thresholds,
  }
}
