import type { SupabaseClient } from '@supabase/supabase-js'
import type { Company } from '@/lib/supabase/types'
import {
  getPaymentsInRange,
  getDebtCategoryCreditorMap,
  getDebtCategoryNames,
  getCreditorNames,
  getDebtsWithRemainingForAnalytics,
  getRevenuesInRange,
  getPaymentsWithDateInRange,
} from './queries'
import { getExchangeRateStrict } from '@/modules/forecast/queries'
import type {
  CompanyAnalytics,
  GroupAnalytics,
  DateRange,
  ExpenseByCategory,
  ExpenseByCreditor,
  DebtAgingRow,
  DebtAgingBucketKey,
  CashFlowMonth,
  TopRiskDebt,
  AnalyticsSummaryKPIs,
} from './types'

const AGING_LABELS: Record<DebtAgingBucketKey, string> = {
  not_due: 'Non échue',
  due_soon: 'À échéance (0–7 j)',
  overdue_8_30: 'En retard (8–30 j)',
  overdue_30_plus: 'En retard (30+ j)',
}

function getAgingBucket(dueDate: string | null): DebtAgingBucketKey {
  if (!dueDate) return 'not_due'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays > 7) return 'not_due'
  if (diffDays >= 0) return 'due_soon'
  if (diffDays >= -30) return 'overdue_8_30'
  return 'overdue_30_plus'
}

function monthKeyToLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${months[Number(m) - 1]} ${y}`
}

/** Build company analytics for a date range. All server-side aggregation. */
export async function getCompanyAnalytics(
  supabase: SupabaseClient,
  companyId: string,
  companyName: string,
  currency: string,
  dateRange: DateRange,
  countryCode?: string
): Promise<CompanyAnalytics> {
  const { from, to } = dateRange

  const [
    payments,
    debtMap,
    categoryNames,
    creditorNames,
    debtsWithRemaining,
    revenues,
    paymentsWithDate,
  ] = await Promise.all([
    getPaymentsInRange(supabase, companyId, from, to),
    getDebtCategoryCreditorMap(supabase, companyId),
    getDebtCategoryNames(supabase, companyId),
    getCreditorNames(supabase, companyId),
    getDebtsWithRemainingForAnalytics(supabase, companyId),
    getRevenuesInRange(supabase, companyId, from, to),
    getPaymentsWithDateInRange(supabase, companyId, from, to),
  ])

  const totalExpenses = payments.reduce((s, p) => s + Number(p.amount_company_currency ?? 0), 0)
  const totalRevenues = revenues.reduce((s, r) => s + Number(r.amount_received ?? 0), 0)
  const overdueDebtsTotal = debtsWithRemaining
    .filter((d) => d.computed_status === 'overdue')
    .reduce((s, d) => s + Number(d.remaining_company_currency ?? 0), 0)

  const summary: AnalyticsSummaryKPIs = {
    totalExpenses,
    totalRevenues,
    netResult: totalRevenues - totalExpenses,
    overdueDebts: overdueDebtsTotal,
  }

  const byCategory = new Map<string, number>()
  const byCreditorPaid = new Map<string, number>()
  const UNCATEGORIZED = '__uncategorized__'
  const UNASSIGNED = '__unassigned__'

  for (const p of payments) {
    const amount = Number(p.amount_company_currency ?? 0)
    const debt = p.debt_id ? debtMap.get(p.debt_id) : null
    const catId = debt?.debt_category_id ?? UNCATEGORIZED
    const credId = debt?.creditor_id ?? UNASSIGNED
    byCategory.set(catId, (byCategory.get(catId) ?? 0) + amount)
    byCreditorPaid.set(credId, (byCreditorPaid.get(credId) ?? 0) + amount)
  }

  const expensesByCategory: ExpenseByCategory[] = Array.from(byCategory.entries())
    .map(([id, total]) => ({
      debtCategoryId: id,
      categoryName: id === UNCATEGORIZED ? 'Non catégorisé' : (categoryNames.get(id) ?? id),
      total,
    }))
    .sort((a, b) => b.total - a.total)

  const byCreditorOutstanding = new Map<string, number>()
  for (const d of debtsWithRemaining) {
    const credId = d.creditor_id ?? UNASSIGNED
    const rem = Number(d.remaining_company_currency ?? 0)
    byCreditorOutstanding.set(credId, (byCreditorOutstanding.get(credId) ?? 0) + rem)
  }

  const allCreditorIds = new Set([...byCreditorPaid.keys(), ...byCreditorOutstanding.keys()])
  const expensesByCreditor: ExpenseByCreditor[] = Array.from(allCreditorIds).map((credId) => ({
    creditorId: credId,
    creditorName: credId === UNASSIGNED ? 'Non assigné' : (creditorNames.get(credId) ?? credId),
    totalPaid: byCreditorPaid.get(credId) ?? 0,
    outstanding: byCreditorOutstanding.get(credId) ?? 0,
  }))
  expensesByCreditor.sort((a, b) => b.totalPaid + b.outstanding - (a.totalPaid + a.outstanding))

  const agingBuckets = new Map<DebtAgingBucketKey, { count: number; total: number }>()
  for (const key of Object.keys(AGING_LABELS) as DebtAgingBucketKey[]) {
    agingBuckets.set(key, { count: 0, total: 0 })
  }
  for (const d of debtsWithRemaining) {
    const bucket = getAgingBucket(d.due_date)
    const cur = agingBuckets.get(bucket)!
    cur.count += 1
    cur.total += Number(d.remaining_company_currency ?? 0)
  }
  const debtAging: DebtAgingRow[] = (Object.keys(AGING_LABELS) as DebtAgingBucketKey[]).map((bucket) => ({
    bucket,
    label: AGING_LABELS[bucket],
    count: agingBuckets.get(bucket)!.count,
    totalRemaining: agingBuckets.get(bucket)!.total,
  }))

  const inflowsByMonth = new Map<string, number>()
  const outflowsByMonth = new Map<string, number>()
  for (const r of revenues) {
    const key = r.received_date.slice(0, 7)
    inflowsByMonth.set(key, (inflowsByMonth.get(key) ?? 0) + Number(r.amount_received ?? 0))
  }
  for (const p of paymentsWithDate) {
    const key = p.payment_date.slice(0, 7)
    outflowsByMonth.set(key, (outflowsByMonth.get(key) ?? 0) + Number(p.amount_company_currency ?? 0))
  }
  const allMonths = new Set([...inflowsByMonth.keys(), ...outflowsByMonth.keys()])
  const sortedMonths = Array.from(allMonths).sort()
  const cashFlowByMonth: CashFlowMonth[] = sortedMonths.map((monthKey) => ({
    monthKey,
    label: monthKeyToLabel(monthKey),
    inflows: inflowsByMonth.get(monthKey) ?? 0,
    outflows: outflowsByMonth.get(monthKey) ?? 0,
    netCash: (inflowsByMonth.get(monthKey) ?? 0) - (outflowsByMonth.get(monthKey) ?? 0),
  }))

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  const in7Str = in7.toISOString().slice(0, 10)
  const topRisks: TopRiskDebt[] = debtsWithRemaining
    .map((d) => {
      const isOverdue = d.computed_status === 'overdue'
      const dueSoon = d.due_date && d.due_date >= today && d.due_date <= in7Str
      return {
        id: d.id,
        title: d.title,
        dueDate: d.due_date,
        remaining: Number(d.remaining_company_currency ?? 0),
        status: isOverdue ? 'overdue' : (dueSoon ? 'due_soon' : ('overdue' as const)),
        creditorName: d.creditor_id ? creditorNames.get(d.creditor_id) : undefined,
      }
    })
    .filter((r) => r.status === 'overdue' || (r.dueDate && r.dueDate >= today && r.dueDate <= in7Str))
    .sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (a.status !== 'overdue' && b.status === 'overdue') return 1
      return b.remaining - a.remaining
    })
    .slice(0, 10)
    .map((r) => ({ ...r, status: r.dueDate && r.dueDate >= today ? ('due_soon' as const) : ('overdue' as const) }))

  return {
    companyId,
    companyName,
    currency,
    countryCode,
    dateRange: { from, to },
    summary,
    expensesByCategory,
    expensesByCreditor,
    debtAging,
    cashFlowByMonth,
    topRisks,
  }
}

/** Build group analytics: aggregate companies with conversion to base currency. */
export async function getGroupAnalytics(
  supabase: SupabaseClient,
  companies: Company[],
  groupId: string,
  baseCurrency: string,
  dateRange: DateRange
): Promise<GroupAnalytics> {
  const companyAnalytics = await Promise.all(
    companies.map((c) =>
      getCompanyAnalytics(
        supabase,
        c.id,
        c.trade_name ?? c.legal_name,
        c.default_currency,
        dateRange,
        c.country_code
      )
    )
  )

  const missingRatesSet = new Set<string>()
  const rateCache = new Map<string, Awaited<ReturnType<typeof getExchangeRateStrict>>>()
  /** Dernier taux en vigueur à la fin de la période analysée (cohérent avec exchange_rates). */
  const fxRefDate = dateRange.to

  async function toBase(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === baseCurrency) return amount
    const key = `${fromCurrency}_${baseCurrency}`
    if (!rateCache.has(key)) {
      rateCache.set(key, await getExchangeRateStrict(fromCurrency, baseCurrency, fxRefDate))
    }
    const strict = rateCache.get(key)!
    if (strict.missing || strict.rate == null) {
      missingRatesSet.add(`${fromCurrency} → ${baseCurrency}`)
      return 0
    }
    return amount * strict.rate
  }

  let totalExpenses = 0
  let totalRevenues = 0
  let overdueDebts = 0
  const byCompany = companyAnalytics.map((a) => ({
    companyId: a.companyId,
    companyName: a.companyName,
    currency: a.currency,
    countryCode: a.countryCode,
    totalExpenses: a.summary.totalExpenses,
    totalRevenues: a.summary.totalRevenues,
    overdueDebts: a.summary.overdueDebts,
  })) as GroupAnalytics['byCompany']

  for (const a of companyAnalytics) {
    totalExpenses += await toBase(a.summary.totalExpenses, a.currency)
    totalRevenues += await toBase(a.summary.totalRevenues, a.currency)
    overdueDebts += await toBase(a.summary.overdueDebts, a.currency)
  }

  const categoryAgg = new Map<string, { name: string; total: number }>()
  for (const a of companyAnalytics) {
    for (const row of a.expensesByCategory) {
      const converted = await toBase(row.total, a.currency)
      const key = row.debtCategoryId
      if (!categoryAgg.has(key)) categoryAgg.set(key, { name: row.categoryName, total: 0 })
      categoryAgg.get(key)!.total += converted
    }
  }
  const expensesByCategory: ExpenseByCategory[] = Array.from(categoryAgg.entries())
    .map(([id, v]) => ({ debtCategoryId: id, categoryName: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total)

  const creditorAgg = new Map<string, { name: string; totalPaid: number; outstanding: number }>()
  for (const a of companyAnalytics) {
    for (const row of a.expensesByCreditor) {
      const key = `${a.companyId}_${row.creditorId}`
      const name = row.creditorName
      const paid = await toBase(row.totalPaid, a.currency)
      const out = await toBase(row.outstanding, a.currency)
      if (!creditorAgg.has(key)) creditorAgg.set(key, { name, totalPaid: 0, outstanding: 0 })
      creditorAgg.get(key)!.totalPaid += paid
      creditorAgg.get(key)!.outstanding += out
    }
  }
  const expensesByCreditor: ExpenseByCreditor[] = Array.from(creditorAgg.entries())
    .map(([, v]) => ({
      creditorId: '',
      creditorName: v.name,
      totalPaid: v.totalPaid,
      outstanding: v.outstanding,
    }))
    .sort((a, b) => b.totalPaid + b.outstanding - (a.totalPaid + a.outstanding))
    .slice(0, 30)

  const agingAgg = new Map<DebtAgingBucketKey, { count: number; total: number }>()
  for (const key of Object.keys(AGING_LABELS) as DebtAgingBucketKey[]) {
    agingAgg.set(key, { count: 0, total: 0 })
  }
  for (const a of companyAnalytics) {
    for (const row of a.debtAging) {
      const conv = await toBase(row.totalRemaining, a.currency)
      const cur = agingAgg.get(row.bucket)!
      cur.count += row.count
      cur.total += conv
    }
  }
  const debtAging: DebtAgingRow[] = (Object.keys(AGING_LABELS) as DebtAgingBucketKey[]).map((bucket) => ({
    bucket,
    label: AGING_LABELS[bucket],
    count: agingAgg.get(bucket)!.count,
    totalRemaining: agingAgg.get(bucket)!.total,
  }))

  const cashByMonth = new Map<string, { inflows: number; outflows: number }>()
  for (const a of companyAnalytics) {
    for (const row of a.cashFlowByMonth) {
      const inConv = await toBase(row.inflows, a.currency)
      const outConv = await toBase(row.outflows, a.currency)
      if (!cashByMonth.has(row.monthKey)) cashByMonth.set(row.monthKey, { inflows: 0, outflows: 0 })
      const cur = cashByMonth.get(row.monthKey)!
      cur.inflows += inConv
      cur.outflows += outConv
    }
  }
  const sortedMonths = Array.from(cashByMonth.keys()).sort()
  const cashFlowByMonth: CashFlowMonth[] = sortedMonths.map((monthKey) => {
    const v = cashByMonth.get(monthKey)!
    return {
      monthKey,
      label: monthKeyToLabel(monthKey),
      inflows: v.inflows,
      outflows: v.outflows,
      netCash: v.inflows - v.outflows,
    }
  })

  const allRisks: TopRiskDebt[] = []
  for (const a of companyAnalytics) {
    for (const r of a.topRisks) {
      allRisks.push({
        ...r,
        remaining: await toBase(r.remaining, a.currency),
      })
    }
  }
  const topRisks = allRisks
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 10)

  return {
    groupId,
    baseCurrency,
    dateRange,
    companiesIncluded: companies.length,
    incomplete: missingRatesSet.size > 0,
    missingExchangeRates: missingRatesSet.size > 0 ? Array.from(missingRatesSet) : undefined,
    summary: {
      totalExpenses,
      totalRevenues,
      netResult: totalRevenues - totalExpenses,
      overdueDebts,
    },
    expensesByCategory,
    expensesByCreditor,
    debtAging,
    cashFlowByMonth,
    topRisks,
    byCompany,
  }
}
