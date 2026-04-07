/**
 * Adaptateur finance → snapshot copilote.
 * Sources : mêmes patterns que modules/forecast (accounts_with_balance, debts_with_remaining, revenues)
 * et conversion FX via getExchangeRateStrictForClient.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Company } from '@/lib/supabase/types'

/** Périmètre minimal pour agrégation (compatible AssistantContext.companies). */
export type CopilotCompanyRef = Pick<Company, 'id' | 'default_currency' | 'legal_name' | 'trade_name'>
import { getExchangeRateStrictForClient } from '@/modules/forecast/queries'
import type { CopilotFinancialSnapshot } from './types'

/** Résumé priorisé pour le prompt système (pas de dump SQL). */
export function buildFinancialHighlightsLines(s: CopilotFinancialSnapshot, base: string): string[] {
  const fmt = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: base }).format(n)

  const lines: string[] = [
    `Cash consolidé : ${fmt(s.availableCash)}${s.fxIncomplete ? ' (FX incomplet)' : ''}.`,
    `Dettes ouvertes ${fmt(s.totalOpenDebt)} · retard ${fmt(s.totalOverdueAmount)} (${s.overdueCount ?? 0}).`,
    `7j : sorties ${fmt(s.dueIn7Days)} · encaissements ${fmt(s.expectedInflows7Days)} · net ${fmt(s.forecastNet7Days)}.`,
    `30j : sorties ${fmt(s.dueIn30Days)} · encaissements ${fmt(s.expectedInflows30Days)} · net ${fmt(s.forecastNet30Days)}.`,
  ]
  if (s.weakestEntity) {
    lines.push(`Entité tendue : ${s.weakestEntity.name} — ${s.weakestEntity.reason}`)
  }
  if (s.criticalOverdueTasksCount != null && s.criticalOverdueTasksCount > 0) {
    lines.push(`Tâches critiques en retard : ${s.criticalOverdueTasksCount}.`)
  }
  lines.push(`Sources : ${s.sourceSummary.join('; ')}.`)
  return lines
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function getCompanyCashLocal(supabase: SupabaseClient, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('accounts_with_balance')
    .select('computed_balance, opening_balance')
    .eq('company_id', companyId)
    .eq('is_active', true)
  const list = data ?? []
  return list.reduce(
    (s, a) =>
      s +
      Number(
        (a as { computed_balance?: number }).computed_balance ??
          (a as { opening_balance?: number }).opening_balance ??
          0
      ),
    0
  )
}

async function debtDueInWindowLocal(
  supabase: SupabaseClient,
  companyId: string,
  start: string,
  end: string
): Promise<number> {
  const { data } = await supabase
    .from('debts_with_remaining')
    .select('remaining_company_currency, due_date, computed_status')
    .eq('company_id', companyId)
    .not('computed_status', 'in', '("paid","cancelled")')
    .not('due_date', 'is', null)
    .gte('due_date', start)
    .lte('due_date', end)
  return (data ?? []).reduce((s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0), 0)
}

async function revenueRemainingInWindowLocal(
  supabase: SupabaseClient,
  companyId: string,
  start: string,
  end: string
): Promise<number> {
  const { data } = await supabase
    .from('revenues')
    .select('amount_expected, amount_received, expected_date, status')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .gte('expected_date', start)
    .lte('expected_date', end)
  let sum = 0
  for (const r of data ?? []) {
    const row = r as { amount_expected: number; amount_received: number | null }
    const rem = Number(row.amount_expected ?? 0) - Number(row.amount_received ?? 0)
    if (rem > 0) sum += rem
  }
  return sum
}

async function convertToBase(
  supabase: SupabaseClient,
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  date: string,
  fxIncomplete: { current: boolean }
): Promise<number> {
  if (fromCurrency === baseCurrency) return amount
  const r = await getExchangeRateStrictForClient(supabase, fromCurrency, baseCurrency, date)
  if (r.missing || r.rate == null) {
    fxIncomplete.current = true
    return 0
  }
  return amount * r.rate
}

function companyLabel(c: CopilotCompanyRef): string {
  return c.trade_name ?? c.legal_name
}

/**
 * Construit le snapshot financier consolidé pour le périmètre sociétés donné.
 */
export async function buildCopilotFinancialSnapshot(
  supabase: SupabaseClient,
  input: { companies: CopilotCompanyRef[]; baseCurrency: string }
): Promise<CopilotFinancialSnapshot> {
  const { companies, baseCurrency } = input
  const asOf = todayIso()
  const end7 = addDays(asOf, 7)
  const end30 = addDays(asOf, 30)

  const sources: string[] = [
    'accounts_with_balance (soldes actifs)',
    'debts_with_remaining (dettes ouvertes, échéances)',
    'revenues (reliquats attendus par date)',
    `exchange_rates → consolidation ${baseCurrency}`,
  ]

  if (companies.length === 0) {
    return {
      asOf,
      baseCurrency,
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
        hasCashData: false,
        hasDebtData: false,
        hasForecastData: false,
        hasReceivablesData: false,
      },
      sourceSummary: [...sources, 'Aucune société dans le périmètre — agrégats vides.'],
      fxIncomplete: false,
      criticalOverdueTasksCount: null,
    }
  }

  const fxIncomplete = { current: false }
  const companyIds = companies.map((c) => c.id)

  const [{ data: debtRows }, { data: revenueRows }, criticalTasksResult] = await Promise.all([
    supabase
      .from('debts_with_remaining')
      .select('id, title, company_id, remaining_company_currency, due_date, computed_status')
      .in('company_id', companyIds)
      .not('computed_status', 'in', '("paid","cancelled")'),
    supabase
      .from('revenues')
      .select('id, title, company_id, amount_expected, amount_received, expected_date, status')
      .in('company_id', companyIds)
      .neq('status', 'cancelled'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('company_id', companyIds)
      .eq('priority', 'critical')
      .lte('due_date', asOf)
      .or('status.eq.todo,status.eq.in_progress'),
  ])

  let totalCashBase = 0
  let totalOpenDebtBase = 0
  let totalOverdueBase = 0
  let overdueCount = 0
  let due7Base = 0
  let due30Base = 0
  let in7Base = 0
  let in30Base = 0

  const perCompanyStress: { id: string; name: string; stress: number; reason: string }[] = []

  for (const c of companies) {
    const cashLoc = await getCompanyCashLocal(supabase, c.id)
    const cashB = await convertToBase(supabase, cashLoc, c.default_currency, baseCurrency, asOf, fxIncomplete)
    totalCashBase += cashB

    const openDebtsLoc = (debtRows ?? []).filter((d) => (d as { company_id: string }).company_id === c.id)
    const openSumLoc = openDebtsLoc.reduce(
      (s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0),
      0
    )
    const openB = await convertToBase(supabase, openSumLoc, c.default_currency, baseCurrency, asOf, fxIncomplete)
    totalOpenDebtBase += openB

    const overdueLoc = openDebtsLoc.filter((d) => (d as { computed_status?: string }).computed_status === 'overdue')
    overdueCount += overdueLoc.length
    const overdueSumLoc = overdueLoc.reduce(
      (s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0),
      0
    )
    const overdueB = await convertToBase(supabase, overdueSumLoc, c.default_currency, baseCurrency, asOf, fxIncomplete)
    totalOverdueBase += overdueB

    const d7loc = await debtDueInWindowLocal(supabase, c.id, asOf, end7)
    const d30loc = await debtDueInWindowLocal(supabase, c.id, asOf, end30)
    const d7B = await convertToBase(supabase, d7loc, c.default_currency, baseCurrency, asOf, fxIncomplete)
    const d30B = await convertToBase(supabase, d30loc, c.default_currency, baseCurrency, asOf, fxIncomplete)
    due7Base += d7B
    due30Base += d30B

    const r7loc = await revenueRemainingInWindowLocal(supabase, c.id, asOf, end7)
    const r30loc = await revenueRemainingInWindowLocal(supabase, c.id, asOf, end30)
    in7Base += await convertToBase(supabase, r7loc, c.default_currency, baseCurrency, asOf, fxIncomplete)
    in30Base += await convertToBase(supabase, r30loc, c.default_currency, baseCurrency, asOf, fxIncomplete)

    const stress =
      overdueB * 1.25 +
      d7B * 0.45 +
      Math.max(0, openB - cashB) * 0.12 +
      (overdueLoc.length >= 2 ? 5000 : 0)
    const reason =
      overdueSumLoc > 0
        ? 'Retards et/ou dettes ouvertes élevées vs liquidités.'
        : d7loc > cashLoc * 0.25
          ? 'Charges à venir 7j significatives vs cash local.'
          : 'Pression relative sur le cash ou les engagements.'
    perCompanyStress.push({ id: c.id, name: companyLabel(c), stress, reason })
  }

  perCompanyStress.sort((a, b) => b.stress - a.stress)
  const weakest = perCompanyStress[0] && perCompanyStress[0].stress > 0 ? perCompanyStress[0] : null

  /** Paiements critiques : plus gros restants dus sous 30j */
  const paymentCandidates = (debtRows ?? [])
    .map((d) => {
      const row = d as {
        id: string
        title: string
        company_id: string
        remaining_company_currency: number
        due_date: string | null
        computed_status?: string
      }
      if (!row.due_date || row.due_date < asOf || row.due_date > end30) return null
      if (row.computed_status === 'paid' || row.computed_status === 'cancelled') return null
      const company = companies.find((x) => x.id === row.company_id)
      return {
        id: row.id,
        label: row.title,
        amount: Number(row.remaining_company_currency ?? 0),
        dueDate: row.due_date,
        companyId: row.company_id,
        entityName: company ? companyLabel(company) : null,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  const recvCandidates = (revenueRows ?? [])
    .map((r) => {
      const row = r as {
        id: string
        title: string
        company_id: string
        amount_expected: number
        amount_received: number | null
        expected_date: string
        status?: string
      }
      const rem = Number(row.amount_expected ?? 0) - Number(row.amount_received ?? 0)
      if (rem <= 0) return null
      if (row.expected_date < asOf || row.expected_date > end30) return null
      const company = companies.find((x) => x.id === row.company_id)
      return {
        id: row.id,
        label: row.title,
        amount: rem,
        expectedDate: row.expected_date,
        companyId: row.company_id,
        entityName: company ? companyLabel(company) : null,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  const net7 = in7Base - due7Base
  const net30 = in30Base - due30Base

  const criticalOverdueTasksCount =
    criticalTasksResult.error != null ? null : (criticalTasksResult.count ?? 0)

  return {
    asOf,
    baseCurrency,
    availableCash: fxIncomplete.current ? null : totalCashBase,
    totalOpenDebt: totalOpenDebtBase,
    totalOverdueAmount: totalOverdueBase,
    overdueCount,
    dueIn7Days: due7Base,
    dueIn30Days: due30Base,
    expectedInflows7Days: in7Base,
    expectedInflows30Days: in30Base,
    forecastNet7Days: net7,
    forecastNet30Days: net30,
    weakestEntity: weakest
      ? { id: weakest.id, name: weakest.name, reason: weakest.reason }
      : null,
    criticalPayments: paymentCandidates.map((p) => ({
      id: p.id,
      label: p.label,
      amount: p.amount,
      dueDate: p.dueDate,
      entityName: p.entityName,
      companyId: p.companyId,
    })),
    criticalReceivables: recvCandidates.map((p) => ({
      id: p.id,
      label: p.label,
      amount: p.amount,
      expectedDate: p.expectedDate,
      entityName: p.entityName,
      companyId: p.companyId,
    })),
    dataQuality: {
      hasCashData: true,
      hasDebtData: (debtRows?.length ?? 0) > 0,
      hasForecastData: true,
      hasReceivablesData: (revenueRows?.length ?? 0) > 0,
    },
    sourceSummary: sources,
    fxIncomplete: fxIncomplete.current,
    criticalOverdueTasksCount,
  }
}
