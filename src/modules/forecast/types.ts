/**
 * Une ligne de revenu dans la fenêtre de détail de prévision (reliquat pris en compte dans les entrées si > 0).
 */
export interface ForecastRevenueLine {
  id: string
  /** Société propriétaire du revenu (lien vers la fiche / modification). */
  companyId: string
  title: string
  sourceName: string | null
  expectedDate: string
  amountExpected: number
  amountReceived: number
  /** Montant compté dans les entrées du mois (généralement max(0, attendu − reçu)). */
  remainingInForecast: number
  /** Prévision consolidée groupe : société d’origine */
  companyName?: string
}

/**
 * Traceability: how inflows/outflows are made up (server-computed).
 */
export interface InflowsBreakdown {
  revenuesRemaining: number
  /** Détail par revenu attendu dans le mois (date d’encaissement prévue dans la période). */
  revenueLines?: ForecastRevenueLine[]
}

export interface OutflowsBreakdown {
  debtsDue: number
  recurringSimulated: number
}

/**
 * One period (month) of forecast. All amounts in company (or group) currency.
 * Computed server-side only; not persisted.
 */
export interface ForecastPeriod {
  periodType: 'month'
  startDate: string
  endDate: string
  /** Label for display, e.g. "Mars 2026" */
  label: string
  openingCash: number
  expectedInflows: number
  expectedOutflows: number
  netCashFlow: number
  closingCashProjected: number
  /** Traceability: breakdown of inflows (revenues remaining only) */
  inflowsBreakdown?: InflowsBreakdown
  /** Traceability: breakdown of outflows (real debts + simulated recurring) */
  outflowsBreakdown?: OutflowsBreakdown
  /** Non-blocking: e.g. "USD → EUR" when rate missing for group */
  currencyConversionWarnings?: string[]
}

export interface CompanyForecast {
  companyId: string
  currency: string
  periods: ForecastPeriod[]
  /** True if any period has conversion warnings (company-level usually none) */
  incomplete?: boolean
  missingExchangeRates?: string[]
  /** True when forecast includes at least one period with simulated recurring (no real debt yet) */
  hasSimulatedRecurring?: boolean
  /** True when at least one period includes partially received revenues (remaining only) */
  hasPartialRevenues?: boolean
}

/**
 * Contribution d’une société pour un mois (montants convertis en devise du groupe).
 */
export interface GroupCompanyPeriodContribution {
  companyId: string
  companyName: string
  currency: string
  /** false si le taux de conversion vers la devise du groupe est manquant */
  included: boolean
  fxRate: number | null
  openingCashBase: number
  expectedInflowsBase: number
  expectedOutflowsBase: number
  netCashFlowBase: number
  /** Clôture projetée en devise du groupe */
  closingCashProjected: number
  inflowsBreakdownBase?: InflowsBreakdown
  outflowsBreakdownBase?: OutflowsBreakdown
}

/**
 * Group-level: one row per period, amounts in group base_currency (converted).
 */
export interface GroupForecastPeriod extends ForecastPeriod {
  /** Par société : flux et ventilation convertis en devise du groupe */
  byCompany?: GroupCompanyPeriodContribution[]
}

export interface GroupForecast {
  groupId: string
  baseCurrency: string
  periods: GroupForecastPeriod[]
  /** True when one or more exchange rates were missing (totals exclude those companies) */
  incomplete?: boolean
  /** Pairs for which no rate was found, e.g. ["USD → EUR"] */
  missingExchangeRates?: string[]
  companiesIncluded: number
  conversionCurrency: string
}

/** Result of strict exchange rate lookup: no silent default to 1. */
export interface ExchangeRateStrictResult {
  rate: number | null
  missing: boolean
}

export interface ExchangeRateRow {
  from_currency: string
  to_currency: string
  rate: number
}
