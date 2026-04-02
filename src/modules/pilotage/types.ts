import type { SupabaseClient } from '@supabase/supabase-js'
import type { AlertSeverity } from '@/lib/supabase/types'

export type DebtTypeAxisCode = 'OPEX' | 'PROD' | 'ACQ' | 'FIN' | 'OTHER'

export interface PilotageAssumption {
  id: string
  label: string
  description: string
  impact: 'low' | 'medium' | 'high'
}

export interface PilotageDateRange {
  from: string
  to: string
}

export interface ProjectRevenuePoint {
  projectKey: string
  revenueExpected: number
  revenueReceived: number
}

export interface ProjectMarginInput {
  projects: ProjectRevenuePoint[]
  totalProductionCosts: number
}

export interface ProjectMarginRow {
  projectKey: string
  revenueExpected: number
  revenueReceived: number
  allocatedProductionCosts: number
  grossMarginExpected: number
  grossMarginRealized: number
  marginRateRealized: number | null
}

export interface ProjectMarginResult {
  rows: ProjectMarginRow[]
  totalRevenueExpected: number
  totalRevenueReceived: number
  totalAllocatedProductionCosts: number
  totalGrossMarginExpected: number
  totalGrossMarginRealized: number
  assumptions: PilotageAssumption[]
}

export interface ClientAcquisitionInput {
  clients: Array<{
    clientKey: string
    revenueExpected: number
    revenueReceived: number
  }>
  totalAcquisitionCosts: number
}

export interface ClientAcquisitionRow {
  clientKey: string
  revenueExpected: number
  revenueReceived: number
  allocatedAcquisitionCost: number
  realizedCostRatio: number | null
}

export interface AcquisitionMetricsResult {
  rows: ClientAcquisitionRow[]
  totalAcquisitionCosts: number
  activeClientsCount: number
  customerAcquisitionCost: number | null
  averageRealizedCostRatio: number | null
  assumptions: PilotageAssumption[]
}

export interface BreakEvenInput {
  realizedRevenue: number
  fixedCosts: number
  variableCosts: number
}

export interface BreakEvenResult {
  fixedCosts: number
  variableCosts: number
  realizedRevenue: number
  contributionMargin: number
  contributionMarginRate: number | null
  breakEvenRevenue: number | null
  safetyMargin: number | null
  assumptions: PilotageAssumption[]
}

export interface TreasuryNeedInput {
  openingCash: number
  expectedInflows: number
  expectedOutflows: number
  horizonDays: number
}

export interface TreasuryNeedResult {
  openingCash: number
  expectedInflows: number
  expectedOutflows: number
  projectedNet: number
  treasuryNeed: number
  averageDailyOutflows: number
  coverageDays: number | null
  assumptions: PilotageAssumption[]
}

export interface PilotageAlert {
  id: string
  axis: 'margin' | 'client_cost' | 'break_even' | 'treasury'
  severity: AlertSeverity
  title: string
  message: string
}

export interface PilotageAlertThresholds {
  minRealizedMarginRateWarning: number
  minRealizedMarginRateCritical: number
  maxAcquisitionCostRatioWarning: number
  maxAcquisitionCostRatioCritical: number
  minSafetyMarginWarning: number
  minSafetyMarginCritical: number
  maxTreasuryNeedWarning: number
  maxTreasuryNeedCritical: number
}

export interface CompanyPilotageData {
  companyId: string
  currency: string
  range: PilotageDateRange
  projectMargin: ProjectMarginResult
  acquisition: AcquisitionMetricsResult
  breakEven: BreakEvenResult
  treasuryNeed: TreasuryNeedResult
  alerts: PilotageAlert[]
  thresholds: PilotageAlertThresholds
}

export interface CompanyPilotageParams {
  supabase: SupabaseClient
  companyId: string
  currency: string
  range: PilotageDateRange
  horizonDays?: number
}
