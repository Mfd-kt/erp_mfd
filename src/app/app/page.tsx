import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { computeGroupAlerts } from '@/modules/alerts/service'
import type { GroupAlertsResult } from '@/modules/alerts/types'
import { GroupDashboardView } from '@/modules/group-dashboard/components/GroupDashboardView'
import { getTasksForGroupDashboard } from '@/modules/tasks/queries'
import { getSprintsForGroupDashboard } from '@/modules/sprints/queries'
import { getDailyPlan } from '@/modules/planning/queries'
import { getRecommendations, getConversations } from '@/modules/assistant/queries'
import {
  buildAlertsSeverityExplain,
  buildEntitiesExplain,
  buildEntityOpenDebtExplain,
  buildOpenDebtsExplain,
  buildOverdueExplain,
  buildRevenuesExplain,
} from '@/modules/group-dashboard/build-payloads'
import { computeDebtFxBreakdown } from '@/modules/group-dashboard/group-fx'
import { getJournalCardData } from '@/modules/daily-journal/queries'
import { JournalDashboardCard } from '@/modules/daily-journal/components/JournalDashboardCard'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatLastUpdateLabel() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date())
}

export default async function GroupDashboardPage() {
  // Access scope is the single source of truth for tenant visibility.
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin) {
    const firstCompany = scope.companies[0]
    if (firstCompany) redirect(`/app/${firstCompany.id}/dashboard`)
    redirect('/app/tasks')
  }

  const companies = scope.companies
  const companyIds = companies.map((c) => c.id)
  const baseCurrency = scope.group?.base_currency ?? 'EUR'

  const user = scope.user
  const supabase = await createClient()

  const companyFilter =
    companyIds.length > 0 ? `company_id.in.(${companyIds.join(',')}),company_id.is.null` : 'company_id.is.null'
  const membershipQuery =
    scope.group?.id
      ? supabase
          .from('memberships')
          .select('user_id, role, company_id')
          .eq('group_id', scope.group.id)
          .or(companyFilter)
      : null

  const [
    { data: debts, error: debtsError },
    { data: revenues, error: revenuesError },
    { data: accounts, error: accountsError },
    tasksDigest,
    groupSprints,
    plan,
    recommendations,
    conversations,
    journalCardData,
    { data: memberships },
    alertsResult,
  ] = await Promise.all([
    supabase
      .from('debts_with_remaining')
      .select('id, company_id, title, currency_code, remaining_company_currency, computed_status, priority')
      .in('company_id', companyIds),
    supabase
      .from('revenues')
      .select('id, company_id, title, amount_expected, amount_received, status')
      .in('company_id', companyIds),
    supabase
      .from('accounts')
      .select('id, company_id, name, account_type, currency_code, current_balance_cached')
      .in('company_id', companyIds)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    getTasksForGroupDashboard(companyIds, { limit: 8 }),
    getSprintsForGroupDashboard(companyIds, 3),
    getDailyPlan(user.id, todayStr()),
    getRecommendations(supabase, user.id, { status: 'open', limit: 3 }),
    getConversations(supabase, user.id, { status: 'active', limit: 1 }),
    getJournalCardData(supabase, user.id),
    membershipQuery ?? Promise.resolve({ data: [] as Array<{ user_id: string; role: string; company_id: string | null }> }),
    scope.group
      ? computeGroupAlerts(supabase, scope.group.id, companies, scope.group.base_currency)
      : Promise.resolve(null as GroupAlertsResult | null),
  ])
  if (debtsError) throw new Error(debtsError.message)
  if (revenuesError) throw new Error(revenuesError.message)
  if (accountsError) throw new Error(accountsError.message)

  const alerts = alertsResult
  const memberUserIds = Array.from(new Set((memberships ?? []).map((m) => m.user_id).filter(Boolean)))
  const { data: profiles } = memberUserIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('user_id, display_name, email')
        .in('user_id', memberUserIds)
    : { data: [] as Array<{ user_id: string; display_name: string | null; email: string | null }> }
  const profileByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]))

  type DebtRow = {
    id: string
    company_id: string
    title: string
    currency_code: string
    remaining_company_currency: number
    computed_status: string
    priority: string
  }
  type RevenueRow = {
    id: string
    company_id: string
    title: string
    amount_expected: number
    amount_received: number
    status: string
  }
  type AccountRow = {
    id: string
    company_id: string
    name: string
    account_type: string
    currency_code: string
    current_balance_cached: number
  }

  const debtRows = (debts ?? []) as DebtRow[]
  const revenueRows = (revenues ?? []) as RevenueRow[]
  const accountRows = (accounts ?? []) as AccountRow[]

  const asOfDate = new Date().toISOString().slice(0, 10)

  // KPI totals are converted to group base currency using latest valid FX rates.
  const [openFx, overdueFx] = await Promise.all([
    computeDebtFxBreakdown(
      debtRows,
      companies,
      baseCurrency,
      (d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled',
      asOfDate
    ),
    computeDebtFxBreakdown(debtRows, companies, baseCurrency, (d) => d.computed_status === 'overdue', asOfDate),
  ])

  const totalOpenDebts = openFx.totalInBase
  const totalOverdue = overdueFx.totalInBase

  const totalRevenueExpected = revenueRows
    .filter((r) => r.status !== 'cancelled')
    .reduce((s, r) => s + Number(r.amount_expected), 0)

  const totalRevenueReceived = revenueRows.reduce((s, r) => s + Number(r.amount_received), 0)

  const criticalDebts = debtRows.filter((d) => d.priority === 'critical' && d.computed_status !== 'paid').length
  const overdueCount = debtRows.filter((d) => d.computed_status === 'overdue').length

  const explainOpen = buildOpenDebtsExplain(openFx, companies)
  const explainOverdue = buildOverdueExplain(overdueFx)
  const explainRev = buildRevenuesExplain(
    revenueRows,
    companies,
    totalRevenueExpected,
    totalRevenueReceived,
    baseCurrency
  )
  const explainEntities = buildEntitiesExplain(companies)

  const entities = companies.map((c) => {
    const companyDebts = debtRows.filter((d) => d.company_id === c.id)
    const companyRevenues = revenueRows.filter((r) => r.company_id === c.id)
    const companyOpenDebt = companyDebts
      .filter((d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled')
      .reduce((s, d) => s + Number(d.remaining_company_currency), 0)
    const companyOpenDebts = companyDebts
      .filter((d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled')
      .map((d) => ({
        id: d.id,
        title: d.title,
        currency_code: d.currency_code,
        remaining_company_currency: Number(d.remaining_company_currency),
      }))
    const od = companyDebts.filter((d) => d.computed_status === 'overdue').length
    const critical = companyDebts.filter((d) => d.priority === 'critical' && d.computed_status !== 'paid').length
    const companyRevenueExpected = companyRevenues
      .filter((r) => r.status !== 'cancelled')
      .reduce((s, r) => s + Number(r.amount_expected), 0)
    const companyRevenueReceived = companyRevenues.reduce((s, r) => s + Number(r.amount_received), 0)
    const taskCompanyStats = tasksDigest.by_company[c.id] ?? { open: 0, todo: 0, in_progress: 0, done: 0 }
    const tasksInProgressCount = taskCompanyStats.in_progress
    const activeSprintsCount = groupSprints.filter((s) => s.company_id === c.id && s.status === 'active').length
    const companyAccounts = accountRows
      .filter((a) => a.company_id === c.id)
      .map((a) => ({
        id: a.id,
        name: a.name,
        account_type: a.account_type,
        currency_code: a.currency_code,
        current_balance_display: formatCurrency(Number(a.current_balance_cached ?? 0), a.currency_code),
      }))
    const companyMembers = (memberships ?? [])
      .filter((m) => m.company_id === c.id || m.company_id === null)
      .map((m) => {
        const profile = profileByUserId.get(m.user_id)
        const roleLabel = m.role === 'group_admin'
          ? 'Admin groupe'
          : m.role === 'company_admin'
            ? 'Admin entreprise'
            : m.role === 'finance_manager'
              ? 'Finance'
              : 'Membre'
        return {
          user_id: m.user_id,
          display_name: profile?.display_name ?? profile?.email ?? `${m.user_id.slice(0, 8)}…`,
          role: roleLabel,
        }
      })
    const uniqueMembers = Array.from(new Map(companyMembers.map((m) => [m.user_id, m])).values())
    // Entity payload is intentionally presentation-ready for the view component.
    return {
      company: c,
      openDebtDisplay: formatCurrency(companyOpenDebt, c.default_currency),
      explainOpenDebt: buildEntityOpenDebtExplain(c, companyDebts),
      overdueCount: od,
      debtsCount: companyDebts.length,
      criticalDebtsCount: critical,
      revenuesExpectedDisplay: formatCurrency(companyRevenueExpected, c.default_currency),
      revenuesReceivedDisplay: formatCurrency(companyRevenueReceived, c.default_currency),
      tasksInProgressCount,
      activeSprintsCount,
      accounts: companyAccounts,
      debts: companyOpenDebts,
      teamMembers: uniqueMembers,
    }
  })

  return (
    <GroupDashboardView
      groupName={scope.group?.name ?? 'Vue groupe'}
      groupId={scope.group?.id ?? null}
      canManageCompanies={scope.isGroupAdmin}
      baseCurrency={baseCurrency}
      entitiesCount={companies.length}
      kpis={{
        openDebts: {
          value: formatCurrency(totalOpenDebts, baseCurrency),
          tone: 'neutral',
          helper:
            criticalDebts > 0
              ? `${criticalDebts} dette(s) critique(s)`
              : openFx.hasMissingRate
                ? `Taux FX manquant — total ${baseCurrency} partiel`
                : 'Vue consolidée groupe',
          explain: explainOpen,
        },
        overdue: {
          value: formatCurrency(totalOverdue, baseCurrency),
          tone: totalOverdue > 0 ? 'critical' : 'neutral',
          helper: overdueFx.hasMissingRate
            ? `${overdueCount} dettes · taux partiel`
            : `${overdueCount} dettes`,
          explain: explainOverdue,
        },
        revenues: {
          value: formatCurrency(totalRevenueExpected, baseCurrency),
          tone: 'info',
          helper: `${formatCurrency(totalRevenueReceived, baseCurrency)} reçus`,
          explain: explainRev,
        },
        entities: {
          value: String(companies.length),
          tone: 'neutral',
          helper: companies.map((c) => c.country_code).join(' · '),
          explain: explainEntities,
        },
      }}
      alertsBlock={
        alerts
          ? {
              critical: {
                value: String(alerts.critical),
                explain: buildAlertsSeverityExplain('critical', alerts.alerts, 'Critiques'),
              },
              warnings: {
                value: String(alerts.warnings),
                explain: buildAlertsSeverityExplain('warning', alerts.alerts, 'Avertissements'),
              },
              infos: {
                value: String(alerts.infos),
                explain: buildAlertsSeverityExplain('info', alerts.alerts, 'Infos'),
              },
              list: alerts.alerts,
            }
          : undefined
      }
      entities={entities}
      execution={{
        tasks: tasksDigest,
        sprints: groupSprints,
        planDate: todayStr(),
        plan,
        recommendations,
        latestConversation: conversations[0] ?? null,
      }}
      journalCard={<JournalDashboardCard data={journalCardData} />}
      lastUpdateLabel={formatLastUpdateLabel()}
    />
  )
}
