import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecurringRule } from '@/lib/supabase/types'
import type { FrequencyType } from '@/lib/supabase/types'
import { getExchangeRateStrict } from './queries'
import { getPeriodKey } from '@/lib/recurrence/period-key'
import type {
  ForecastPeriod,
  CompanyForecast,
  GroupForecast,
  GroupForecastPeriod,
  GroupCompanyPeriodContribution,
  InflowsBreakdown,
  OutflowsBreakdown,
  ForecastRevenueLine,
} from './types'
import type { Company } from '@/lib/supabase/types'

const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function lastDayOfMonth(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

/** Rule would generate a debt for this (year, month) if in range and frequency matches. */
function ruleGeneratesForMonth(rule: RecurringRule, year: number, month: number): boolean {
  const periodStart = firstDayOfMonth(year, month)
  const periodEnd = lastDayOfMonth(year, month)
  if (rule.start_date > periodEnd) return false
  if (rule.end_date != null && rule.end_date < periodStart) return false
  const freq = rule.frequency as FrequencyType
  if (freq === 'monthly') return true
  if (freq === 'quarterly') return month === 1 || month === 4 || month === 7 || month === 10
  if (freq === 'yearly') return rule.month_of_year === month
  return true
}

async function getOpeningCash(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('accounts_with_balance')
    .select('computed_balance, opening_balance')
    .eq('company_id', companyId)
    .eq('is_active', true)
  const list = data ?? []
  return list.reduce((s, a) => s + Number((a as { computed_balance?: number; opening_balance?: number }).computed_balance ?? (a as { opening_balance?: number }).opening_balance ?? 0), 0)
}

/**
 * Inflows from revenues: only remaining expected (amount_expected - amount_received).
 * Exclude when remaining_expected <= 0. Server-side only.
 */
async function getExpectedInflowsForPeriod(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<{ total: number; breakdown: InflowsBreakdown; hasPartial: boolean }> {
  const { data } = await supabase
    .from('revenues')
    .select('id, company_id, title, source_name, amount_expected, amount_received, expected_date, status')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .gte('expected_date', startDate)
    .lte('expected_date', endDate)
  const list = (data ?? []) as {
    id: string
    company_id: string
    title: string
    source_name: string | null
    amount_expected: number
    amount_received: number | null
    expected_date: string
  }[]
  let revenuesRemaining = 0
  const revenueLines: ForecastRevenueLine[] = []
  for (const r of list) {
    const expected = Number(r.amount_expected ?? 0)
    const received = Number(r.amount_received ?? 0)
    const remaining = expected - received
    const remainingInForecast = remaining > 0 ? remaining : 0
    if (remaining > 0) revenuesRemaining += remaining
    revenueLines.push({
      id: r.id,
      companyId: r.company_id ?? companyId,
      title: r.title,
      sourceName: r.source_name,
      expectedDate: r.expected_date,
      amountExpected: expected,
      amountReceived: received,
      remainingInForecast,
    })
  }
  revenueLines.sort(
    (a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.title.localeCompare(b.title, 'fr')
  )
  const hasPartial = list.some((r) => {
    const received = Number(r.amount_received ?? 0)
    const expected = Number(r.amount_expected ?? 0)
    return expected > 0 && received > 0 && received < expected
  })
  return {
    total: revenuesRemaining,
    breakdown: { revenuesRemaining, revenueLines },
    hasPartial,
  }
}

function companyForecastHasSimulatedRecurring(periods: ForecastPeriod[]): boolean {
  return periods.some((p) => (p.outflowsBreakdown?.recurringSimulated ?? 0) > 0)
}

async function getDebtOutflowsForPeriod(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<{ total: number; breakdown: OutflowsBreakdown }> {
  const { data } = await supabase
    .from('debts_with_remaining')
    .select('remaining_company_currency, due_date, computed_status')
    .eq('company_id', companyId)
    .not('computed_status', 'in', '("paid","cancelled")')
    .not('due_date', 'is', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
  const list = (data ?? []) as { remaining_company_currency: number }[]
  const debtsDue = list.reduce((s, d) => s + Number(d.remaining_company_currency ?? 0), 0)
  return { total: debtsDue, breakdown: { debtsDue, recurringSimulated: 0 } }
}

/**
 * Recurring outflows for month: only simulate when no real debt exists for (rule, period).
 * Double-count protection: if debt exists with source_recurring_rule_id + generated_period_key, do not add.
 */
async function getRecurringOutflowsForMonth(
  supabase: SupabaseClient,
  companyId: string,
  year: number,
  month: number
): Promise<{ total: number; breakdown: OutflowsBreakdown }> {
  const { data: rules } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
  const list = (rules ?? []) as RecurringRule[]
  const { data: existingDebts } = await supabase
    .from('debts')
    .select('source_recurring_rule_id, generated_period_key')
    .eq('company_id', companyId)
    .not('source_recurring_rule_id', 'is', null)
    .not('generated_period_key', 'is', null)
  const existingSet = new Set(
    (existingDebts ?? []).map(
      (d: { source_recurring_rule_id: string; generated_period_key: string }) =>
        `${d.source_recurring_rule_id}|${d.generated_period_key}`
    )
  )
  let recurringSimulated = 0
  for (const rule of list) {
    if (!ruleGeneratesForMonth(rule, year, month)) continue
    const periodKey = getPeriodKey(rule.frequency as FrequencyType, year, month)
    if (existingSet.has(`${rule.id}|${periodKey}`)) continue
    recurringSimulated += Number(rule.amount ?? 0)
  }
  return { total: recurringSimulated, breakdown: { debtsDue: 0, recurringSimulated } }
}

async function getExpectedOutflowsForPeriod(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string,
  endDate: string,
  year: number,
  month: number
): Promise<{ total: number; breakdown: OutflowsBreakdown }> {
  const debt = await getDebtOutflowsForPeriod(supabase, companyId, startDate, endDate)
  const recurring = await getRecurringOutflowsForMonth(supabase, companyId, year, month)
  return {
    total: debt.total + recurring.total,
    breakdown: {
      debtsDue: debt.breakdown.debtsDue,
      recurringSimulated: recurring.breakdown.recurringSimulated,
    },
  }
}

/**
 * Generate forecast for a company for the next N months.
 * Month 1 = current month; opening = real balance. Next months: opening = previous closing.
 * All amounts in company default currency. No data stored; computed on each call.
 */
export async function generateCompanyForecast(
  supabase: SupabaseClient,
  companyId: string,
  currency: string,
  months: number = 3
): Promise<CompanyForecast> {
  const periods: ForecastPeriod[] = []
  const now = new Date()
  let openingCash = await getOpeningCash(supabase, companyId)
  let hasPartialRevenues = false

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const startDate = firstDayOfMonth(year, month)
    const endDate = lastDayOfMonth(year, month)

    const inflows = await getExpectedInflowsForPeriod(supabase, companyId, startDate, endDate)
    if (inflows.hasPartial) hasPartialRevenues = true
    const outflows = await getExpectedOutflowsForPeriod(supabase, companyId, startDate, endDate, year, month)
    const netCashFlow = inflows.total - outflows.total
    const closingCashProjected = openingCash + netCashFlow

    periods.push({
      periodType: 'month',
      startDate,
      endDate,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      openingCash,
      expectedInflows: inflows.total,
      expectedOutflows: outflows.total,
      netCashFlow,
      closingCashProjected,
      inflowsBreakdown: inflows.breakdown,
      outflowsBreakdown: outflows.breakdown,
    })

    openingCash = closingCashProjected
  }

  return {
    companyId,
    currency,
    periods,
    hasSimulatedRecurring: companyForecastHasSimulatedRecurring(periods),
    hasPartialRevenues,
  }
}

/**
 * Generate group forecast: one forecast per company, then aggregate in group base_currency.
 * Uses getExchangeRateStrict: no default to 1. If any rate missing, forecast is incomplete.
 */
export async function generateGroupForecast(
  supabase: SupabaseClient,
  companies: Company[],
  groupId: string,
  baseCurrency: string,
  months: number = 3
): Promise<GroupForecast> {
  const forecasts = await Promise.all(
    companies.map((c) => generateCompanyForecast(supabase, c.id, c.default_currency, months))
  )
  const periods: GroupForecastPeriod[] = []
  const missingRatesSet = new Set<string>()

  /** Cache FX strict lookup per period date (same for all companies in that month). */
  const rateCache = new Map<string, Awaited<ReturnType<typeof getExchangeRateStrict>>>()

  for (let i = 0; i < months; i++) {
    const d = new Date()
    const periodDate = new Date(d.getFullYear(), d.getMonth() + i, 1)
    const y = periodDate.getFullYear()
    const m = periodDate.getMonth() + 1 // 1–12
    // Taux : dernier enregistrement avec rate_date ≤ cette date. Utiliser la fin du mois
    // (et non le 1er) pour inclure les taux publiés en cours de mois (ex. effet le 20).
    const fxRefDate = lastDayOfMonth(y, m)

    let openingCash = 0
    let expectedInflows = 0
    let expectedOutflows = 0
    const aggInflows: InflowsBreakdown = { revenuesRemaining: 0 }
    const mergedRevenueLines: ForecastRevenueLine[] = []
    const aggOutflows: OutflowsBreakdown = { debtsDue: 0, recurringSimulated: 0 }
    const byCompany: GroupCompanyPeriodContribution[] = []
    const periodWarnings: string[] = []

    for (let j = 0; j < companies.length; j++) {
      const company = companies[j]
      const forecast = forecasts[j]
      const period = forecast?.periods[i]
      if (!period) continue

      const cacheKey = `${company.default_currency}\0${baseCurrency}\0${fxRefDate}`
      let strict = rateCache.get(cacheKey)
      if (!strict) {
        strict = await getExchangeRateStrict(company.default_currency, baseCurrency, fxRefDate)
        rateCache.set(cacheKey, strict)
      }
      if (strict.missing) {
        const pair = `${company.default_currency} → ${baseCurrency}`
        missingRatesSet.add(pair)
        periodWarnings.push(pair)
        byCompany.push({
          companyId: company.id,
          companyName: company.trade_name ?? company.legal_name,
          currency: company.default_currency,
          included: false,
          fxRate: null,
          openingCashBase: 0,
          expectedInflowsBase: 0,
          expectedOutflowsBase: 0,
          netCashFlowBase: 0,
          closingCashProjected: 0,
        })
        continue
      }
      const rate = strict.rate!
      const ib = period.inflowsBreakdown ?? { revenuesRemaining: 0 }
      const ob = period.outflowsBreakdown ?? { debtsDue: 0, recurringSimulated: 0 }
      openingCash += period.openingCash * rate
      expectedInflows += period.expectedInflows * rate
      expectedOutflows += period.expectedOutflows * rate
      aggInflows.revenuesRemaining += ib.revenuesRemaining * rate
      const companyLabel = company.trade_name ?? company.legal_name
      for (const line of ib.revenueLines ?? []) {
        mergedRevenueLines.push({
          ...line,
          companyId: line.companyId ?? company.id,
          companyName: companyLabel,
          amountExpected: line.amountExpected * rate,
          amountReceived: line.amountReceived * rate,
          remainingInForecast: line.remainingInForecast * rate,
        })
      }
      aggOutflows.debtsDue += ob.debtsDue * rate
      aggOutflows.recurringSimulated += ob.recurringSimulated * rate
      byCompany.push({
        companyId: company.id,
        companyName: companyLabel,
        currency: company.default_currency,
        included: true,
        fxRate: rate,
        openingCashBase: period.openingCash * rate,
        expectedInflowsBase: period.expectedInflows * rate,
        expectedOutflowsBase: period.expectedOutflows * rate,
        netCashFlowBase: period.netCashFlow * rate,
        closingCashProjected: period.closingCashProjected * rate,
        inflowsBreakdownBase: { revenuesRemaining: ib.revenuesRemaining * rate },
        outflowsBreakdownBase: { debtsDue: ob.debtsDue * rate, recurringSimulated: ob.recurringSimulated * rate },
      })
    }

    const netCashFlow = expectedInflows - expectedOutflows
    const closingCashProjected = openingCash + netCashFlow
    const firstPeriod = forecasts[0]?.periods[i]
    mergedRevenueLines.sort(
      (a, b) =>
        (a.companyName ?? '').localeCompare(b.companyName ?? '', 'fr') ||
        a.expectedDate.localeCompare(b.expectedDate) ||
        a.title.localeCompare(b.title, 'fr')
    )
    if (mergedRevenueLines.length > 0) {
      aggInflows.revenueLines = mergedRevenueLines
    }
    periods.push({
      periodType: 'month',
      startDate: firstPeriod?.startDate ?? '',
      endDate: firstPeriod?.endDate ?? '',
      label: firstPeriod?.label ?? '',
      openingCash,
      expectedInflows,
      expectedOutflows,
      netCashFlow,
      closingCashProjected,
      inflowsBreakdown: aggInflows,
      outflowsBreakdown: aggOutflows,
      byCompany,
      currencyConversionWarnings: periodWarnings.length > 0 ? periodWarnings : undefined,
    })
  }

  return {
    groupId,
    baseCurrency,
    periods,
    incomplete: missingRatesSet.size > 0,
    missingExchangeRates: missingRatesSet.size > 0 ? Array.from(missingRatesSet) : undefined,
    companiesIncluded: companies.length,
    conversionCurrency: baseCurrency,
  }
}
