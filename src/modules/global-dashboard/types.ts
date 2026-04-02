import type { CompanyType } from '@/lib/supabase/types'

export type GlobalScope = 'all' | 'business' | 'personal'
export type GlobalPeriod = 30 | 60 | 90

export interface EntityBreakdownRow {
  companyId: string
  companyName: string
  type: CompanyType
  currency: string
  cash: number
  openDebts: number
  receivables: number
  projected30DayClosing: number
  status: 'ok' | 'warning' | 'critical'
}

export interface UpcomingObligation {
  id: string
  companyId: string
  companyName: string
  title: string
  dueDate: string | null
  remaining: number
  currency: string
  isOverdue: boolean
  priority: string
  href: string
}

export interface CashTensionPoint {
  label: string
  date: string
  projectedCash: number
  isLowest: boolean
}

/** Détail par société pour les popups « origine du calcul » (taux = dernier enregistrement ≤ date). */
export interface GlobalCompanyFxRow {
  companyId: string
  companyName: string
  currency: string
  /** Date utilisée pour trésorerie, obligations, à recevoir, tampon */
  refDate: string
  rateRef: number | null
  rateRefMissing: boolean
  cash: { local: number; inBase: number | null }
  openDebts: { local: number; inBase: number | null }
  receivables: { local: number; inBase: number | null }
  safetyBuffer: { local: number; inBase: number | null }
  /** Dernière période de l’horizon (alignée sur la carte « Clôture projetée ») */
  lastPeriodClosing: {
    local: number
    inBase: number | null
    periodStartDate: string
    rate: number | null
    rateMissing: boolean
  }
}

export interface GlobalDashboardData {
  baseCurrency: string
  /** Date du jour (référence affichage). */
  asOfDate: string
  incomplete: boolean
  missingExchangeRates: string[]
  scope: GlobalScope
  periodDays: GlobalPeriod
  /** Libellé du dernier mois de l’horizon (ex. « mars 2026 »), pour les explications KPI. */
  lastHorizonLabel: string

  // KPIs (consolidated in base currency)
  totalCash: number
  openObligations: number
  receivables: number
  projectedClosingCash: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  safeWithdrawalCapacity: number
  safetyBuffer: number

  // Cash tension
  cashTensionPoints: CashTensionPoint[]
  strongestPressurePoint: CashTensionPoint | null

  // Entity breakdown
  entityBreakdown: EntityBreakdownRow[]

  /** Détail FX par entité (popups Contrôle global) */
  companyFxRows: GlobalCompanyFxRow[]

  // Upcoming obligations
  upcomingObligations: UpcomingObligation[]
  overdueObligations: UpcomingObligation[]

  // Companies included (for display)
  companiesIncluded: number
}
