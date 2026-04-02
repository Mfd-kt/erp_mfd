import type { SupabaseClient } from '@supabase/supabase-js'
import type { Company, CompanyType } from '@/lib/supabase/types'
import { getExchangeRateStrict } from '@/modules/forecast/queries'
import { generateCompanyForecast } from '@/modules/forecast/service'
import type {
  GlobalDashboardData,
  GlobalScope,
  GlobalPeriod,
  EntityBreakdownRow,
  UpcomingObligation,
  CashTensionPoint,
  GlobalCompanyFxRow,
} from './types'

const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function filterCompaniesByScope(companies: Company[], scope: GlobalScope): Company[] {
  if (scope === 'all') return companies
  const typeFilter = scope === 'personal' ? 'personal' : 'business'
  return companies.filter((c) => (c.type ?? 'business') === typeFilter)
}

function periodToMonths(days: GlobalPeriod): number {
  if (days === 30) return 1
  if (days === 60) return 2
  return 3
}

async function getCompanyCash(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('accounts_with_balance')
    .select('computed_balance, opening_balance')
    .eq('company_id', companyId)
    .eq('is_active', true)
  const list = data ?? []
  return list.reduce((s, a) => s + Number((a as { computed_balance?: number }).computed_balance ?? (a as { opening_balance?: number }).opening_balance ?? 0), 0)
}

async function getCompanyOpenDebts(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('debts_with_remaining')
    .select('remaining_company_currency, computed_status')
    .eq('company_id', companyId)
    .not('computed_status', 'in', '("paid","cancelled")')
  const list = (data ?? []) as { remaining_company_currency: number }[]
  return list.reduce((s, d) => s + Number(d.remaining_company_currency ?? 0), 0)
}

async function getCompanyReceivables(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('revenues')
    .select('amount_expected, amount_received, status')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
  const list = (data ?? []) as { amount_expected: number; amount_received: number }[]
  return list.reduce((s, r) => {
    const expected = Number(r.amount_expected ?? 0)
    const received = Number(r.amount_received ?? 0)
    const remaining = expected - received
    return s + (remaining > 0 ? remaining : 0)
  }, 0)
}

/** 1 month of fixed recurring outflows (sum of active recurring rules amounts). */
async function getSafetyBuffer(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('recurring_rules')
    .select('amount')
    .eq('company_id', companyId)
    .eq('is_active', true)
  const list = (data ?? []) as { amount: number }[]
  return list.reduce((s, r) => s + Number(r.amount ?? 0), 0)
}

function computeStatus(projectedClosing: number, openDebts: number): 'ok' | 'warning' | 'critical' {
  if (projectedClosing < 0) return 'critical'
  if (projectedClosing < openDebts * 0.5) return 'warning'
  return 'ok'
}

function computeRiskLevel(
  projectedClosing: number,
  overdueCount: number,
  totalObligations: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (projectedClosing < 0 || overdueCount > 3) return 'critical'
  if (projectedClosing < totalObligations * 0.3 || overdueCount > 0) return 'high'
  if (projectedClosing < totalObligations) return 'medium'
  return 'low'
}

export async function getGlobalDashboardData(
  supabase: SupabaseClient,
  companies: Company[],
  scope: GlobalScope,
  periodDays: GlobalPeriod,
  baseCurrency: string
): Promise<GlobalDashboardData> {
  const filtered = filterCompaniesByScope(companies, scope)
  const months = periodToMonths(periodDays)
  const today = new Date().toISOString().slice(0, 10)

  const missingRatesSet = new Set<string>()

  // Fetch raw data per company in parallel
  const companyData = await Promise.all(
    filtered.map(async (c) => {
      const [cash, openDebts, receivables, safetyBuffer, forecast] = await Promise.all([
        getCompanyCash(supabase, c.id),
        getCompanyOpenDebts(supabase, c.id),
        getCompanyReceivables(supabase, c.id),
        getSafetyBuffer(supabase, c.id),
        generateCompanyForecast(supabase, c.id, c.default_currency, Math.max(months, 3)),
      ])
      const projected30 = forecast.periods[0]?.closingCashProjected ?? cash
      return {
        company: c,
        cash,
        openDebts,
        receivables,
        safetyBuffer,
        forecast,
        projected30DayClosing: projected30,
      }
    })
  )

  // Convert to base currency and aggregate
  let totalCash = 0
  let totalOpenObligations = 0
  let totalReceivables = 0
  let totalSafetyBuffer = 0

  const entityBreakdown: EntityBreakdownRow[] = []
  const entityProjectedByPeriod: Map<number, number> = new Map()
  const companyFxRows: GlobalCompanyFxRow[] = []

  async function convertWithMeta(
    company: Company,
    amount: number,
    date: string
  ): Promise<{ inBase: number | null; rate: number | null; missing: boolean }> {
    if (company.default_currency === baseCurrency) {
      return { inBase: amount, rate: 1, missing: false }
    }
    const strict = await getExchangeRateStrict(company.default_currency, baseCurrency, date)
    if (strict.missing) {
      missingRatesSet.add(`${company.default_currency} → ${baseCurrency}`)
      return { inBase: null, rate: null, missing: true }
    }
    return { inBase: amount * (strict.rate ?? 0), rate: strict.rate ?? null, missing: false }
  }

  for (const cd of companyData) {
    const { company, cash, openDebts, receivables, safetyBuffer, forecast, projected30DayClosing } = cd
    const refDate = forecast.periods[0]?.startDate ?? today

    const cashM = await convertWithMeta(company, cash, refDate)
    const debtsM = await convertWithMeta(company, openDebts, refDate)
    const recvM = await convertWithMeta(company, receivables, refDate)
    const bufferM = await convertWithMeta(company, safetyBuffer, refDate)

    const lastIdx = months - 1
    const lp = forecast.periods[lastIdx]
    const lastLocal = lp?.closingCashProjected ?? projected30DayClosing
    const lastStart = lp?.startDate ?? refDate
    const lastM = await convertWithMeta(company, lastLocal, lastStart)

    totalCash += cashM.inBase ?? 0
    totalOpenObligations += debtsM.inBase ?? 0
    totalReceivables += recvM.inBase ?? 0
    totalSafetyBuffer += bufferM.inBase ?? 0

    companyFxRows.push({
      companyId: company.id,
      companyName: company.trade_name ?? company.legal_name,
      currency: company.default_currency,
      refDate,
      rateRef: cashM.rate,
      rateRefMissing: cashM.missing,
      cash: { local: cash, inBase: cashM.inBase },
      openDebts: { local: openDebts, inBase: debtsM.inBase },
      receivables: { local: receivables, inBase: recvM.inBase },
      safetyBuffer: { local: safetyBuffer, inBase: bufferM.inBase },
      lastPeriodClosing: {
        local: lastLocal,
        inBase: lastM.inBase,
        periodStartDate: lastStart,
        rate: lastM.rate,
        rateMissing: lastM.missing,
      },
    })

    entityBreakdown.push({
      companyId: company.id,
      companyName: company.trade_name ?? company.legal_name,
      type: (company.type ?? 'business') as CompanyType,
      currency: company.default_currency,
      cash,
      openDebts,
      receivables,
      projected30DayClosing,
      status: computeStatus(projected30DayClosing, openDebts),
    })

    const convertForChart = async (amount: number, date?: string) => {
      const r = await convertWithMeta(company, amount, date ?? refDate)
      return r.inBase ?? 0
    }

    for (let i = 0; i < forecast.periods.length; i++) {
      const p = forecast.periods[i]
      const projectedBasePeriod = await convertForChart(p.closingCashProjected, p.startDate)
      const existing = entityProjectedByPeriod.get(i) ?? 0
      entityProjectedByPeriod.set(i, existing + projectedBasePeriod)
    }
  }

  const consolidatedTension: CashTensionPoint[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date()
    const periodDate = new Date(d.getFullYear(), d.getMonth() + i, 1)
    const label = `${MONTH_LABELS[periodDate.getMonth()]} ${periodDate.getFullYear()}`
    const projectedCash = entityProjectedByPeriod.get(i) ?? totalCash
    consolidatedTension.push({
      label,
      date: new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).toISOString().slice(0, 10),
      projectedCash,
      isLowest: false,
    })
  }
  const minProjected = Math.min(...consolidatedTension.map((p) => p.projectedCash), totalCash)
  consolidatedTension.forEach((p) => {
    p.isLowest = p.projectedCash === minProjected && minProjected < totalCash
  })
  const strongestPressurePoint = consolidatedTension.find((p) => p.isLowest) ?? consolidatedTension[consolidatedTension.length - 1] ?? null

  const lastHorizonLabel = consolidatedTension[consolidatedTension.length - 1]?.label ?? ''
  const lastPeriodProjected =
    consolidatedTension[consolidatedTension.length - 1]?.projectedCash ?? totalCash

  // Safe withdrawal
  const safeWithdrawalRaw = lastPeriodProjected - totalSafetyBuffer
  const safeWithdrawalCapacity = Math.max(0, safeWithdrawalRaw)

  // Upcoming obligations (biggest due, overdue)
  const { data: debtsRaw } = await supabase
    .from('debts_with_remaining')
    .select('id, company_id, title, due_date, remaining_company_currency, computed_status, priority')
    .in('company_id', filtered.map((c) => c.id))
    .not('computed_status', 'in', '("paid","cancelled")')
    .order('due_date', { ascending: true, nullsFirst: false })

  const debtsList = (debtsRaw ?? []) as {
    id: string
    company_id: string
    title: string
    due_date: string | null
    remaining_company_currency: number
    computed_status: string
    priority: string
  }[]

  const companyMap = new Map(filtered.map((c) => [c.id, c]))
  const upcomingObligations: UpcomingObligation[] = []
  const overdueObligations: UpcomingObligation[] = []

  for (const d of debtsList) {
    const company = companyMap.get(d.company_id)
    if (!company) continue
    const isOverdue = d.computed_status === 'overdue'
    const obligation: UpcomingObligation = {
      id: d.id,
      companyId: d.company_id,
      companyName: company.trade_name ?? company.legal_name,
      title: d.title,
      dueDate: d.due_date,
      remaining: Number(d.remaining_company_currency ?? 0),
      currency: company.default_currency,
      isOverdue,
      priority: d.priority ?? 'normal',
      href: `/app/${d.company_id}/debts/${d.id}`,
    }
    if (isOverdue) overdueObligations.push(obligation)
    upcomingObligations.push(obligation)
  }

  // Sort upcoming by due date, take top 10
  upcomingObligations.sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
  const topUpcoming = upcomingObligations.slice(0, 10)

  const riskLevel = computeRiskLevel(
    lastPeriodProjected,
    overdueObligations.length,
    totalOpenObligations
  )
  const projectedClosingCash = lastPeriodProjected

  return {
    baseCurrency,
    asOfDate: today,
    incomplete: missingRatesSet.size > 0,
    missingExchangeRates: Array.from(missingRatesSet),
    scope,
    periodDays,
    lastHorizonLabel,
    totalCash,
    openObligations: totalOpenObligations,
    receivables: totalReceivables,
    projectedClosingCash,
    riskLevel,
    safeWithdrawalCapacity,
    safetyBuffer: totalSafetyBuffer,
    cashTensionPoints: consolidatedTension,
    strongestPressurePoint,
    entityBreakdown,
    companyFxRows,
    upcomingObligations: topUpcoming,
    overdueObligations,
    companiesIncluded: filtered.length,
  }
}
