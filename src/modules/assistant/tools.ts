import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantContext } from './types'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { generateCompanyForecast, generateGroupForecast } from '@/modules/forecast/service'
import { computeCompanyAlerts, computeGroupAlerts } from '@/modules/alerts/service'
import { getDailyPlan } from '@/modules/planning/queries'
import { getSprintWithProgress } from '@/modules/sprints/queries'
import { sendToChannel } from '@/modules/notifications/channels'
import { createPendingAction } from './confirmations'
import { createSprint } from '@/modules/sprints/actions'
import type { Company } from '@/lib/supabase/types'

type ToolResult = { success: boolean; data?: unknown; error?: string }

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

async function getSupabaseAndScope(ctx?: { supabase?: SupabaseClient }) {
  if (ctx?.supabase) return { supabase: ctx.supabase, scope: null }
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope) throw new Error('Non authentifié')
  return { supabase, scope }
}

function getScopeCompanies(ctx: AssistantContext, scope: Awaited<ReturnType<typeof getSupabaseAndScope>>['scope']) {
  const companies = scope?.companies ?? ctx.companies
  return companies as (Company & { type?: string })[]
}

/**
 * Read tools - fetch ERP data for the assistant. All respect access scope.
 */
export const readTools = {
  /** Use when user asks about scope, companies, group, personal entity, or what entities are available. */
  async get_current_scope_context(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { scope } = await getSupabaseAndScope(ctx)
      const companies = getScopeCompanies(ctx, scope) as (Company & { type?: string })[]
      const companyIds = companies.map((c) => c.id)
      const group = scope?.group ?? null
      const baseCurrency = group?.base_currency ?? ctx.groupBaseCurrency ?? 'EUR'
      const personalCount = companies.filter((c) => (c as { type?: string }).type === 'personal').length
      const businessCount = companies.filter((c) => (c as { type?: string }).type !== 'personal').length
      const hasPersonalEntity = personalCount > 0

      const modeDescriptions: Record<string, string> = {
        global: 'Vue groupe consolidée',
        business: 'Vue business (sociétés professionnelles)',
        personal: 'Vue finances personnelles',
      }
      const currentModeDescription = modeDescriptions[ctx.scopeType] ?? ctx.scopeType

      const accessibleCompanies = companies.map((c) => ({
        id: c.id,
        name: (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name,
        type: (c as { type?: string }).type ?? 'business',
        country: (c as { country_code?: string }).country_code ?? null,
        defaultCurrency: (c as { default_currency?: string }).default_currency ?? 'EUR',
      }))

      const companyNames = accessibleCompanies.map((c) => c.name)

      return {
        success: true,
        data: {
          scopeType: ctx.scopeType,
          groupId: group?.id ?? ctx.groupId ?? null,
          groupName: group?.name ?? null,
          baseCurrency,
          accessibleCompanyCount: companyIds.length,
          hasPersonalEntity,
          personalEntitiesCount: personalCount,
          businessEntitiesCount: businessCount,
          accessibleCompanies,
          companyNames,
          currentModeDescription,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  /** Use when user asks which companies/entities they have access to. Filter: business | personal. */
  async list_accessible_companies(
    ctx: AssistantContext,
    filterType?: 'business' | 'personal'
  ): Promise<ToolResult> {
    try {
      const { scope } = await getSupabaseAndScope(ctx)
      let companies = getScopeCompanies(ctx, scope) as (Company & { type?: string })[]
      if (filterType) {
        companies = companies.filter((c) => (c as { type?: string }).type === filterType)
      }
      const list = companies.map((c) => ({
        id: c.id,
        name: (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name,
        type: (c as { type?: string }).type ?? 'business',
        country: (c as { country_code?: string }).country_code ?? null,
        defaultCurrency: (c as { default_currency?: string }).default_currency ?? 'EUR',
      }))
      return { success: true, data: { count: list.length, companies: list } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  /** Use for broad executive summaries: "résume ma situation", "état global", "que dois-je savoir aujourd'hui". */
  async get_full_global_context(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const [scopeCtx, dashboard, forecast, alerts, tasks, dailyPlan, safeWithdrawal] = await Promise.all([
        readTools.get_current_scope_context(ctx),
        readTools.get_global_dashboard(ctx, 30),
        readTools.get_global_forecast(ctx, 3),
        readTools.get_recent_alerts(ctx),
        readTools.get_open_tasks(ctx),
        readTools.get_daily_plan(ctx),
        readTools.get_safe_withdrawal_capacity(ctx),
      ])

      const scopeData = scopeCtx.success ? scopeCtx.data : null
      const dashboardData = dashboard.success ? dashboard.data : null
      const forecastData = forecast.success ? forecast.data : null
      const alertsData = alerts.success ? alerts.data : null
      const tasksData = tasks.success ? tasks.data : null
      const dailyPlanData = dailyPlan.success ? dailyPlan.data : null
      const safeData = safeWithdrawal.success ? safeWithdrawal.data : null

      return {
        success: true,
        data: {
          scope: scopeData,
          dashboard: dashboardData,
          forecastSummary: forecastData,
          alertsSummary: alertsData,
          openTasksSummary: tasksData,
          dailyPlanSummary: dailyPlanData,
          safeWithdrawalSummary: safeData,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  /** Search across companies, creditors, debts, revenues, recurring rules, tasks. Returns top matches with type and id. */
  async search_erp_entities(ctx: AssistantContext, query: string): Promise<ToolResult> {
    try {
      const { supabase } = await getSupabaseAndScope(ctx)
      const companyIds = ctx.companyIds
      const q = String(query).trim().toLowerCase()
      if (!q || q.length < 2) {
        return { success: true, data: { matches: [], message: 'Requête trop courte' } }
      }

      const pattern = `%${q}%`
      const [companiesRes, creditorsRes, debtsRes, revenuesRes, rulesRes, tasksRes] = await Promise.all([
        supabase.from('companies').select('id, legal_name, trade_name').in('id', companyIds).or(`legal_name.ilike.${pattern},trade_name.ilike.${pattern}`).limit(5),
        supabase.from('creditors').select('id, name, company_id').in('company_id', companyIds).ilike('name', pattern).limit(5),
        supabase.from('debts_with_remaining').select('id, title, company_id').in('company_id', companyIds).ilike('title', pattern).limit(5),
        supabase.from('revenues').select('id, title, company_id').in('company_id', companyIds).ilike('title', pattern).limit(5),
        supabase.from('recurring_rules').select('id, title, company_id').in('company_id', companyIds).ilike('title', pattern).limit(5),
        supabase.from('tasks').select('id, title, company_id').not('status', 'in', '("done","cancelled")').ilike('title', pattern).limit(20),
      ])

      const matches: { type: string; id: string; title: string; companyId?: string }[] = []
      for (const c of companiesRes.data ?? []) {
        const name = (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name
        matches.push({ type: 'company', id: (c as { id: string }).id, title: name })
      }
      for (const r of creditorsRes.data ?? []) {
        matches.push({ type: 'creditor', id: (r as { id: string }).id, title: (r as { name: string }).name, companyId: (r as { company_id?: string }).company_id })
      }
      for (const d of debtsRes.data ?? []) {
        matches.push({ type: 'debt', id: (d as { id: string }).id, title: (d as { title: string }).title, companyId: (d as { company_id?: string }).company_id })
      }
      for (const r of revenuesRes.data ?? []) {
        matches.push({ type: 'revenue', id: (r as { id: string }).id, title: (r as { title: string }).title, companyId: (r as { company_id?: string }).company_id })
      }
      for (const r of rulesRes.data ?? []) {
        matches.push({ type: 'recurring_rule', id: (r as { id: string }).id, title: (r as { title: string }).title, companyId: (r as { company_id?: string }).company_id })
      }
      for (const t of tasksRes.data ?? []) {
        const tid = t as { id: string; title: string; company_id: string | null }
        if (!tid.company_id || companyIds.includes(tid.company_id)) {
          matches.push({ type: 'task', id: tid.id, title: tid.title, companyId: tid.company_id ?? undefined })
        }
      }

      return { success: true, data: { count: matches.length, matches: matches.slice(0, 15) } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  /** Administrative obligations: overdue/due-soon debts with category info. Best-effort fiscal/admin detection. */
  async get_admin_obligations(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase } = await getSupabaseAndScope(ctx)
      const today = new Date().toISOString().slice(0, 10)
      const until = new Date()
      until.setDate(until.getDate() + 14)
      const untilStr = until.toISOString().slice(0, 10)

      const [{ data: overdueData }, { data: dueSoonData }, { data: categories }] = await Promise.all([
        supabase
          .from('debts_with_remaining')
          .select('id, title, company_id, debt_category_id, remaining_company_currency, due_date, priority')
          .in('company_id', ctx.companyIds)
          .eq('computed_status', 'overdue')
          .order('priority', { ascending: false })
          .limit(15),
        supabase
          .from('debts_with_remaining')
          .select('id, title, company_id, debt_category_id, remaining_company_currency, due_date')
          .in('company_id', ctx.companyIds)
          .not('computed_status', 'in', '("paid","cancelled","overdue")')
          .gte('due_date', today)
          .lte('due_date', untilStr)
          .order('due_date', { ascending: true })
          .limit(15),
        supabase
          .from('debt_categories')
          .select('id, name')
          .or(ctx.companyIds.length > 0 ? `company_id.is.null,company_id.in.(${ctx.companyIds.join(',')})` : 'company_id.is.null'),
      ])

      const catMap = new Map((categories ?? []).map((c) => [(c as { id: string }).id, (c as { name: string }).name]))
      const fiscalKeywords = ['fiscal', 'impôt', 'taxe', 'urssaf', 'social', 'charges', 'tva', 'cotisation']
      const enrich = (d: { debt_category_id?: string; [k: string]: unknown }) => {
        const catName = (d.debt_category_id && catMap.get(d.debt_category_id)) ?? ''
        const isLikelyFiscal = fiscalKeywords.some((k) => catName.toLowerCase().includes(k))
        return { ...d, categoryName: catName, isLikelyFiscal }
      }

      const overdue = (overdueData ?? []).map(enrich)
      const dueSoon = (dueSoonData ?? []).map(enrich)
      const all = [...overdue, ...dueSoon]

      return {
        success: true,
        data: {
          overdueCount: overdue.length,
          dueSoonCount: dueSoon.length,
          obligations: all.slice(0, 25),
          note: 'Dettes en retard et à échéance sous 14 jours. isLikelyFiscal si catégorie suggère fiscal/admin.',
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_global_dashboard(ctx: AssistantContext, periodDays = 30): Promise<ToolResult> {
    try {
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const companies = getScopeCompanies(ctx, scope)
      const companyIds = companies.map((c) => c.id)
      const today = new Date().toISOString().slice(0, 10)
      const from = new Date()
      from.setDate(from.getDate() - periodDays)
      const fromStr = from.toISOString().slice(0, 10)

      const personalCount = companies.filter((c) => (c as { type?: string }).type === 'personal').length
      const businessCount = companies.filter((c) => (c as { type?: string }).type !== 'personal').length
      const companyNames = companies.map((c) => (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name)
      const groupName = scope?.group?.name ?? null
      const baseCurrency = scope?.group?.base_currency ?? ctx.groupBaseCurrency ?? 'EUR'

      const [{ data: debts }, { data: revenues }, { data: accounts }] = await Promise.all([
        supabase
          .from('debts_with_remaining')
          .select('company_id, remaining_company_currency, computed_status, priority, due_date')
          .in('company_id', companyIds),
        supabase
          .from('revenues')
          .select('company_id, amount_expected, amount_received, status, expected_date')
          .in('company_id', companyIds),
        supabase
          .from('accounts_with_balance')
          .select('company_id, computed_balance, opening_balance')
          .in('company_id', companyIds)
          .eq('is_active', true),
      ])

      const totalCash = (accounts ?? []).reduce(
        (s, a) => s + Number((a as { computed_balance?: number }).computed_balance ?? (a as { opening_balance?: number }).opening_balance ?? 0),
        0
      )
      const openDebts = (debts ?? []).filter(
        (d) => (d as { computed_status?: string }).computed_status !== 'paid' && (d as { computed_status?: string }).computed_status !== 'cancelled'
      )
      const totalOpenDebt = openDebts.reduce((s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0), 0)
      const overdue = openDebts.filter((d) => (d as { computed_status?: string }).computed_status === 'overdue')
      const totalOverdue = overdue.reduce((s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0), 0)
      const totalRevenueExpected = (revenues ?? [])
        .filter((r) => (r as { status?: string }).status !== 'cancelled')
        .reduce((s, r) => s + Number((r as { amount_expected?: number }).amount_expected ?? 0), 0)
      const totalRevenueReceived = (revenues ?? []).reduce(
        (s, r) => s + Number((r as { amount_received?: number }).amount_received ?? 0),
        0
      )

      return {
        success: true,
        data: {
          totalCash,
          totalOpenDebt,
          totalOverdue,
          overdueCount: overdue.length,
          totalRevenueExpected,
          totalRevenueReceived,
          companiesCount: companyIds.length,
          companyNames,
          groupName,
          baseCurrency,
          personalEntitiesCount: personalCount,
          businessEntitiesCount: businessCount,
          periodDays,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_company_dashboard(ctx: AssistantContext, companyId: string): Promise<ToolResult> {
    try {
      if (!ctx.companyIds.includes(companyId)) return { success: false, error: 'Accès refusé à cette société' }
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const company = (scope?.companies ?? ctx.companies).find((c) => c.id === companyId)
      if (!company) return { success: false, error: 'Société introuvable' }

      const [{ data: debts }, { data: accounts }, alertsResult] = await Promise.all([
        supabase
          .from('debts_with_remaining')
          .select('remaining_company_currency, computed_status, priority, due_date, title')
          .eq('company_id', companyId)
          .order('due_date', { ascending: true })
          .limit(10),
        supabase
          .from('accounts_with_balance')
          .select('computed_balance, opening_balance')
          .eq('company_id', companyId)
          .eq('is_active', true),
        computeCompanyAlerts(supabase, companyId),
      ])

      const totalCash = (accounts ?? []).reduce(
        (s, a) => s + Number((a as { computed_balance?: number }).computed_balance ?? (a as { opening_balance?: number }).opening_balance ?? 0),
        0
      )
      const openDebts = (debts ?? []).filter(
        (d) => (d as { computed_status?: string }).computed_status !== 'paid' && (d as { computed_status?: string }).computed_status !== 'cancelled'
      )
      const totalOpenDebt = openDebts.reduce((s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0), 0)
      const overdue = openDebts.filter((d) => (d as { computed_status?: string }).computed_status === 'overdue')

      const companyType = (company as { type?: string }).type ?? 'business'
      const companyCountry = (company as { country_code?: string }).country_code ?? null

      return {
        success: true,
        data: {
          companyName: company.trade_name ?? company.legal_name,
          companyType,
          companyCountry,
          companyCurrency: company.default_currency,
          currency: company.default_currency,
          totalCash: formatCurrency(totalCash, company.default_currency),
          totalOpenDebt: formatCurrency(totalOpenDebt, company.default_currency),
          overdueCount: overdue.length,
          alertsCount: alertsResult.alerts.length,
          topAlerts: alertsResult.alerts.slice(0, 5).map((a) => ({ title: a.title, severity: a.severity })),
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_global_forecast(ctx: AssistantContext, periodMonths = 3): Promise<ToolResult> {
    try {
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      if (!scope?.group) return { success: false, error: 'Pas de groupe' }
      const forecast = await generateGroupForecast(
        supabase,
        scope.companies,
        scope.group.id,
        scope.group.base_currency,
        periodMonths
      )
      const summary = forecast.periods.map((p) => ({
        label: p.label,
        opening: formatCurrency(p.openingCash, forecast.baseCurrency),
        closing: formatCurrency(p.closingCashProjected, forecast.baseCurrency),
        netFlow: formatCurrency(p.netCashFlow, forecast.baseCurrency),
      }))
      return {
        success: true,
        data: {
          currency: forecast.baseCurrency,
          incomplete: forecast.incomplete,
          missingRates: forecast.missingExchangeRates,
          periods: summary,
          companiesIncluded: forecast.companiesIncluded,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_company_forecast(ctx: AssistantContext, companyId: string, months = 3): Promise<ToolResult> {
    try {
      if (!ctx.companyIds.includes(companyId)) return { success: false, error: 'Accès refusé' }
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const company = (scope?.companies ?? ctx.companies).find((c) => c.id === companyId)
      if (!company) return { success: false, error: 'Société introuvable' }
      const forecast = await generateCompanyForecast(supabase, companyId, company.default_currency, months)
      const summary = forecast.periods.map((p) => ({
        label: p.label,
        opening: formatCurrency(p.openingCash, forecast.currency),
        closing: formatCurrency(p.closingCashProjected, forecast.currency),
        netFlow: formatCurrency(p.netCashFlow, forecast.currency),
      }))
      return {
        success: true,
        data: {
          companyName: company.trade_name ?? company.legal_name,
          currency: forecast.currency,
          periods: summary,
          hasPartialRevenues: forecast.hasPartialRevenues,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_overdue_debts(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase } = await getSupabaseAndScope(ctx)
      const { data } = await supabase
        .from('debts_with_remaining')
        .select('id, title, company_id, remaining_company_currency, due_date, priority')
        .in('company_id', ctx.companyIds)
        .eq('computed_status', 'overdue')
        .order('priority', { ascending: false })
        .limit(20)
      const list = (data ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        remaining: (d as { remaining_company_currency?: number }).remaining_company_currency,
        dueDate: (d as { due_date?: string }).due_date,
        priority: (d as { priority?: string }).priority,
      }))
      return { success: true, data: { count: list.length, debts: list } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_due_soon_debts(ctx: AssistantContext, days = 7): Promise<ToolResult> {
    try {
      const { supabase } = await getSupabaseAndScope(ctx)
      const today = new Date().toISOString().slice(0, 10)
      const until = new Date()
      until.setDate(until.getDate() + days)
      const untilStr = until.toISOString().slice(0, 10)
      const { data } = await supabase
        .from('debts_with_remaining')
        .select('id, title, company_id, remaining_company_currency, due_date')
        .in('company_id', ctx.companyIds)
        .not('computed_status', 'in', '("paid","cancelled","overdue")')
        .gte('due_date', today)
        .lte('due_date', untilStr)
        .order('due_date', { ascending: true })
        .limit(20)
      const list = (data ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        remaining: (d as { remaining_company_currency?: number }).remaining_company_currency,
        dueDate: (d as { due_date?: string }).due_date,
      }))
      return { success: true, data: { count: list.length, debts: list } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_unreceived_revenues(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase } = await getSupabaseAndScope(ctx)
      const { data } = await supabase
        .from('revenues')
        .select('id, title, company_id, amount_expected, amount_received, expected_date, status')
        .in('company_id', ctx.companyIds)
        .neq('status', 'cancelled')
      const list = (data ?? []).filter((r) => {
        const expected = Number((r as { amount_expected?: number }).amount_expected ?? 0)
        const received = Number((r as { amount_received?: number }).amount_received ?? 0)
        return expected > received
      })
      return {
        success: true,
        data: {
          count: list.length,
          revenues: list.slice(0, 15).map((r) => ({
            id: r.id,
            title: (r as { title?: string }).title,
            expected: (r as { amount_expected?: number }).amount_expected,
            received: (r as { amount_received?: number }).amount_received,
            expectedDate: (r as { expected_date?: string }).expected_date,
          })),
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_recent_alerts(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const companies = getScopeCompanies(ctx, scope)
      const companyNameMap = new Map(companies.map((c) => [c.id, (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name]))

      const allAlerts: { title: string; severity: string; companyId: string | null; companyName?: string }[] = []
      if (scope?.group) {
        const result = await computeGroupAlerts(
          supabase,
          scope.group.id,
          scope.companies,
          scope.group.base_currency
        )
        allAlerts.push(...result.alerts.map((a) => ({
          title: a.title,
          severity: a.severity,
          companyId: a.companyId,
          companyName: a.companyId ? companyNameMap.get(a.companyId) : undefined,
        })))
      }
      for (const c of companies) {
        const result = await computeCompanyAlerts(supabase, c.id)
        allAlerts.push(...result.alerts.map((a) => ({
          title: a.title,
          severity: a.severity,
          companyId: a.companyId,
          companyName: a.companyId ? companyNameMap.get(a.companyId) : undefined,
        })))
      }
      const bySeverity = { critical: 0, warning: 0, info: 0 }
      for (const a of allAlerts) {
        if (a.severity === 'critical') bySeverity.critical++
        else if (a.severity === 'warning') bySeverity.warning++
        else bySeverity.info++
      }
      const sorted = [...allAlerts].sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 }
        return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3)
      })
      return {
        success: true,
        data: {
          critical: bySeverity.critical,
          warnings: bySeverity.warning,
          info: bySeverity.info,
          groupedCounts: bySeverity,
          alerts: sorted.slice(0, 15),
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_daily_plan(ctx: AssistantContext, date?: string): Promise<ToolResult> {
    try {
      const supabase = await createClient()
      const planDate = date ?? new Date().toISOString().slice(0, 10)
      const plan = await getDailyPlan(ctx.userId, planDate, supabase)
      if (!plan) return { success: true, data: { hasPlan: false } }
      return {
        success: true,
        data: {
          hasPlan: true,
          primary: plan.primary_task ? { title: plan.primary_task.title, status: plan.primary_task.status } : null,
          secondary1: plan.secondary_task_1 ? { title: plan.secondary_task_1.title, status: plan.secondary_task_1.status } : null,
          secondary2: plan.secondary_task_2 ? { title: plan.secondary_task_2.title, status: plan.secondary_task_2.status } : null,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_open_tasks(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const companyIds = scope ? scope.companies.map((c) => c.id) : ctx.companyIds
      const companyNameMap = new Map(
        (scope?.companies ?? ctx.companies).map((c) => [
          c.id,
          (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name,
        ])
      )

      const { data } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date, company_id, scope_type')
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50)

      const filtered = (data ?? []).filter(
        (t) => !(t as { company_id?: string }).company_id || companyIds.includes((t as { company_id: string }).company_id)
      )
      return {
        success: true,
        data: {
          count: filtered.length,
          tasks: filtered.slice(0, 15).map((t) => ({
            id: (t as { id: string }).id,
            title: (t as { title: string }).title,
            priority: (t as { priority?: string }).priority,
            dueDate: (t as { due_date?: string }).due_date,
            scopeType: (t as { scope_type?: string }).scope_type,
            scopeLabel: (t as { scope_type?: string }).scope_type === 'personal' ? 'personnel' : (t as { scope_type?: string }).scope_type === 'business' ? 'business' : 'global',
            companyName: (t as { company_id?: string }).company_id ? companyNameMap.get((t as { company_id: string }).company_id) : null,
          })),
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_sprint_summary(ctx: AssistantContext, sprintId: string): Promise<ToolResult> {
    try {
      const sprint = await getSprintWithProgress(sprintId)
      if (!sprint) return { success: false, error: 'Sprint introuvable' }
      return {
        success: true,
        data: {
          title: sprint.title,
          status: sprint.status,
          progress: sprint.progress_percent,
          completedTasks: sprint.completed_tasks,
          totalTasks: sprint.total_tasks,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  /** Sprints récents du périmètre (société ou global). */
  async list_recent_sprints(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const companyIds = ctx.companyIds
      const orFilter =
        companyIds.length > 0
          ? `company_id.in.(${companyIds.join(',')}),company_id.is.null`
          : 'company_id.is.null'

      const { data, error } = await supabase
        .from('sprints')
        .select('id, title, status, scope_type, company_id, start_date, end_date, goal')
        .or(orFilter)
        .order('start_date', { ascending: false })
        .limit(15)

      if (error) throw new Error(error.message)

      const companies = scope?.companies ?? ctx.companies
      const nameById = new Map(companies.map((c) => [c.id, (c as { trade_name?: string }).trade_name ?? (c as { legal_name: string }).legal_name]))

      const sprints = (data ?? []).map((s) => ({
        id: (s as { id: string }).id,
        title: (s as { title: string }).title,
        status: (s as { status: string }).status,
        scopeType: (s as { scope_type: string }).scope_type,
        startDate: (s as { start_date: string }).start_date,
        endDate: (s as { end_date: string }).end_date,
        goal: (s as { goal?: string | null }).goal ?? null,
        companyName: (s as { company_id?: string | null }).company_id
          ? nameById.get((s as { company_id: string }).company_id) ?? null
          : null,
      }))

      return { success: true, data: { count: sprints.length, sprints } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async get_safe_withdrawal_capacity(ctx: AssistantContext): Promise<ToolResult> {
    try {
      const { supabase, scope } = await getSupabaseAndScope(ctx)
      const companyIds = (scope?.companies ?? ctx.companies).map((c) => c.id)
      const companies = scope?.companies ?? ctx.companies
      const groupId = scope?.group?.id ?? ctx.groupId
      const baseCurrency = scope?.group?.base_currency ?? ctx.groupBaseCurrency ?? 'EUR'
      const forecast = groupId && companies.length > 0
        ? await generateGroupForecast(supabase, companies as import('@/lib/supabase/types').Company[], groupId, baseCurrency, 3)
        : null
      if (!forecast) return { success: false, error: 'Pas de prévision groupe' }
      const firstPeriod = forecast.periods[0]
      const minClosing = Math.min(...forecast.periods.map((p) => p.closingCashProjected))
      const { data: debts } = await supabase
        .from('debts_with_remaining')
        .select('remaining_company_currency')
        .in('company_id', companyIds)
        .eq('computed_status', 'overdue')
      const totalOverdue = (debts ?? []).reduce((s, d) => s + Number((d as { remaining_company_currency?: number }).remaining_company_currency ?? 0), 0)
      return {
        success: true,
        data: {
          currency: forecast.baseCurrency,
          currentMonthClosing: firstPeriod?.closingCashProjected,
          minProjectedClosing: minClosing,
          totalOverdue,
          safeBuffer: Math.max(0, minClosing - totalOverdue),
          incomplete: forecast.incomplete,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },
}

/**
 * Action tools - require confirmation for sensitive ones.
 * These return a "pending_confirmation" result when confirmation is needed.
 */
export const actionTools = {
  async create_task(
    ctx: AssistantContext,
    params: { title: string; description?: string; priority?: string; companyId?: string }
  ): Promise<ToolResult> {
    try {
      const { createTask } = await import('@/modules/tasks/actions')
      const task = await createTask({
        title: params.title,
        description: params.description ?? null,
        task_type: 'secondary',
        status: 'todo',
        priority: (params.priority as 'low' | 'normal' | 'high' | 'critical') ?? 'normal',
        energy_level: 'medium',
        company_id: params.companyId && ctx.companyIds.includes(params.companyId) ? params.companyId : null,
        scope_type: params.companyId ? 'business' : 'global',
      })
      return { success: true, data: { taskId: (task as { id: string }).id, title: (task as { title: string }).title } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async create_recommendation(
    supabase: SupabaseClient,
    ctx: AssistantContext,
    params: {
      title: string
      body?: string
      severity?: string
      recommendationType: string
      linkedEntityType?: string
      linkedEntityId?: string
    }
  ): Promise<ToolResult> {
    try {
      const { data, error } = await supabase
        .from('assistant_recommendations')
        .insert({
          user_id: ctx.userId,
          company_id: params.linkedEntityType === 'company' ? params.linkedEntityId : null,
          scope_type: ctx.scopeType,
          recommendation_type: params.recommendationType,
          severity: (params.severity as 'info' | 'warning' | 'critical') ?? 'info',
          title: params.title,
          body: params.body ?? null,
          status: 'open',
          linked_entity_type: params.linkedEntityType ?? null,
          linked_entity_id: params.linkedEntityId ?? null,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return { success: true, data: { recommendationId: (data as { id: string })?.id ?? null } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async propose_create_sprint(
    supabase: SupabaseClient,
    ctx: AssistantContext,
    params: {
      title: string
      goal?: string
      scopeType: string
      companyId?: string
      durationDays?: number
    },
    conversationId?: string | null
  ): Promise<ToolResult> {
    try {
      const id = await createPendingAction(supabase, {
        conversationId: conversationId ?? null,
        userId: ctx.userId,
        actionName: 'create_sprint',
        actionPayload: params,
      })
      return {
        success: true,
        data: {
          pendingActionId: id,
          message: 'Création de sprint proposée. L\'utilisateur doit confirmer dans l\'interface.',
          requiresConfirmation: true,
        },
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async execute_create_sprint(
    ctx: AssistantContext,
    payload: {
      title: string
      goal?: string
      scopeType: string
      companyId?: string
      durationDays?: number
    }
  ): Promise<ToolResult> {
    try {
      const today = new Date()
      const days = payload.durationDays ?? 14
      const end = new Date(today)
      end.setDate(end.getDate() + days)
      const sprint = await createSprint({
        title: payload.title,
        goal: payload.goal ?? null,
        scope_type: (payload.scopeType as 'global' | 'business' | 'personal') ?? 'global',
        company_id: payload.companyId && ctx.companyIds.includes(payload.companyId) ? payload.companyId : null,
        start_date: today.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        status: 'planned',
        priority: 'normal',
      })
      return { success: true, data: { sprintId: (sprint as { id: string }).id, title: (sprint as { title: string }).title } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },

  async send_slack_notification(ctx: AssistantContext, title: string, message: string): Promise<ToolResult> {
    try {
      const supabase = await createClient()
      const { data: channel } = await supabase
        .from('notification_channels')
        .select('config_json')
        .eq('user_id', ctx.userId)
        .eq('channel_type', 'slack')
        .eq('is_active', true)
        .single()
      const config = (channel?.config_json as { webhook_url?: string }) ?? {}
      if (!config.webhook_url) return { success: false, error: 'Slack non configuré' }
      const result = await sendToChannel('slack', config, { title, message })
      return result.success ? { success: true } : { success: false, error: result.error }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  },
}
