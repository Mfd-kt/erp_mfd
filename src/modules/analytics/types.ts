/**
 * Analytics types — reporting and decision-making.
 * All amounts aggregated server-side.
 */

/** Preset or custom date range for analytics filters */
export type PeriodPreset = 'current_month' | 'last_3_months' | 'last_6_months' | 'custom'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string
}

/** KPI summary for a period */
export interface AnalyticsSummaryKPIs {
  totalExpenses: number
  totalRevenues: number
  netResult: number
  overdueDebts: number
}

/** One row: expense total by debt category */
export interface ExpenseByCategory {
  debtCategoryId: string
  categoryName: string
  total: number
}

/** One row: paid + outstanding per creditor */
export interface ExpenseByCreditor {
  creditorId: string
  creditorName: string
  totalPaid: number
  outstanding: number
}

/** Debt aging buckets (company or group) */
export type DebtAgingBucketKey = 'not_due' | 'due_soon' | 'overdue_8_30' | 'overdue_30_plus'

export interface DebtAgingRow {
  bucket: DebtAgingBucketKey
  label: string
  count: number
  totalRemaining: number
}

/** Monthly cash flow point */
export interface CashFlowMonth {
  monthKey: string // YYYY-MM
  label: string
  inflows: number
  outflows: number
  netCash: number
}

/** Top risk: high overdue or upcoming */
export interface TopRiskDebt {
  id: string
  title: string
  dueDate: string | null
  remaining: number
  status: 'overdue' | 'due_soon'
  creditorName?: string
}

/** Company-level analytics result */
export interface CompanyAnalytics {
  companyId: string
  companyName: string
  currency: string
  countryCode?: string
  dateRange: DateRange
  summary: AnalyticsSummaryKPIs
  expensesByCategory: ExpenseByCategory[]
  expensesByCreditor: ExpenseByCreditor[]
  debtAging: DebtAgingRow[]
  cashFlowByMonth: CashFlowMonth[]
  topRisks: TopRiskDebt[]
}

/** Group-level: aggregated + per-company comparison */
export interface GroupAnalytics {
  groupId: string
  baseCurrency: string
  dateRange: DateRange
  companiesIncluded: number
  /** True when some companies were excluded due to missing FX rates */
  incomplete?: boolean
  /** Pairs for which no rate was found, e.g. ["USD → EUR"] */
  missingExchangeRates?: string[]
  /** Aggregated KPIs in base currency (converted) */
  summary: AnalyticsSummaryKPIs
  /** Aggregated by category (converted) */
  expensesByCategory: ExpenseByCategory[]
  /** Aggregated by creditor (converted) */
  expensesByCreditor: ExpenseByCreditor[]
  debtAging: DebtAgingRow[]
  cashFlowByMonth: CashFlowMonth[]
  topRisks: TopRiskDebt[]
  /** Per-company breakdown for comparison */
  byCompany: {
    companyId: string
    companyName: string
    currency: string
    countryCode?: string
    totalExpenses: number
    totalRevenues: number
    overdueDebts: number
  }[]
}
