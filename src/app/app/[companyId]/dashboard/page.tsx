import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getRevenueStats, getRevenueMonthBreakdowns } from '@/modules/revenues/queries'
import {
  buildDashboardAlertsExplain,
  buildDashboardCashExplain,
  buildDashboardExpectedRevenueExplain,
  buildDashboardNetProjectionExplain,
  buildDashboardOpenDebtsExplain,
  buildDashboardOverdueExplain,
  buildDashboardProjectionEndMonthExplain,
  buildDashboardProjectionNextMonthExplain,
  buildDashboardReceivedRevenueExplain,
} from '@/modules/dashboard/build-company-dashboard-explains'
import { generateCompanyForecast } from '@/modules/forecast/service'
import { computeCompanyAlerts } from '@/modules/alerts/service'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { AlertsList } from '@/modules/alerts/components/AlertsList'
import type { Company, AccountWithBalance, DebtWithRemaining } from '@/lib/supabase/types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

/** Libellé mois + année (ex. « mars 2026 ») — la classe section-label l’affiche en capitales */
function formatMonthYearFr(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
}

export default async function CompanyDashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRaw } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!companyRaw) notFound()
  const company = companyRaw as Company

  const [revenueStatsResult, { data: debts }, { data: accounts }, forecast, alertsResult, revenueMonthBreakdowns] =
    await Promise.all([
      getRevenueStats(companyId, company.default_currency),
      supabase
        .from('debts_with_remaining')
        .select('*, creditors(name), debt_categories(name)')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('accounts_with_balance')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true),
      generateCompanyForecast(supabase, companyId, company.default_currency, 2),
      computeCompanyAlerts(supabase, companyId),
      getRevenueMonthBreakdowns(companyId),
    ])

  const revenueStats = revenueStatsResult
  const accountsList = (accounts ?? []) as AccountWithBalance[]
  const debtsRows = (debts ?? []) as DebtWithRemaining[]
  const totalCash = accountsList.reduce((s, a) => s + Number(a.computed_balance ?? a.opening_balance), 0)
  const openDebts = debtsRows.filter((d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled')
  const totalOpenDebt = openDebts.reduce((s, d) => s + Number(d.remaining_company_currency), 0)
  const overdueDebts = openDebts.filter(d => d.computed_status === 'overdue')
  const netProjection = revenueStats.expectedThisMonth - totalOpenDebt

  const endOfMonthProjected = forecast.periods[0]?.closingCashProjected ?? totalCash
  /** Mois suivant : trésorerie à partir de l’actuel + flux du seul mois M+1 (échéances ponctuelles + récurrentes simulées + revenus attendus ce mois-là), sans enchaîner la clôture du mois en cours. */
  const openingNow = forecast.periods[0]?.openingCash ?? totalCash
  const nextMonthPeriod = forecast.periods[1]
  const nextMonthIsolatedClosing =
    nextMonthPeriod != null ? openingNow + nextMonthPeriod.expectedInflows - nextMonthPeriod.expectedOutflows : undefined

  const today = new Date()
  const currentMonthYearLabel = formatMonthYearFr(today)
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const nextMonthYearLabel = formatMonthYearFr(nextMonthDate)

  const explains = {
    cash: buildDashboardCashExplain(accountsList, totalCash, company.default_currency, companyId),
    openDebts: buildDashboardOpenDebtsExplain(openDebts, totalOpenDebt, company.default_currency, companyId),
    overdue: buildDashboardOverdueExplain(overdueDebts, company.default_currency, companyId),
    expectedRevenue: buildDashboardExpectedRevenueExplain(
      revenueMonthBreakdowns.expectedLines,
      revenueStats.expectedThisMonth,
      company.default_currency,
      companyId
    ),
    receivedRevenue: buildDashboardReceivedRevenueExplain(
      revenueMonthBreakdowns.receivedLines,
      revenueStats.receivedThisMonth,
      company.default_currency,
      companyId
    ),
    netProjection: buildDashboardNetProjectionExplain(
      revenueStats,
      totalOpenDebt,
      netProjection,
      company.default_currency,
      companyId
    ),
    projectionEnd: buildDashboardProjectionEndMonthExplain(
      currentMonthYearLabel,
      forecast.periods[0],
      company.default_currency,
      companyId
    ),
    projectionNext: buildDashboardProjectionNextMonthExplain(
      nextMonthYearLabel,
      openingNow,
      forecast.periods[1],
      nextMonthIsolatedClosing,
      company.default_currency,
      companyId
    ),
    alertsCritical: buildDashboardAlertsExplain('critical', alertsResult.critical, alertsResult.alerts, companyId),
    alertsWarnings: buildDashboardAlertsExplain('warnings', alertsResult.warnings, alertsResult.alerts, companyId),
    alertsInfos: buildDashboardAlertsExplain('infos', alertsResult.infos, alertsResult.alerts, companyId),
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title={company.trade_name ?? company.legal_name}
        subtitle={`${company.legal_name} · ${company.country_code} · ${company.default_currency}`}
        explain={KPI_EXPLAIN.pageDashboard()}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: 'Trésorerie disponible',
            value: formatCurrency(totalCash, company.default_currency),
            tone: totalCash < 0 ? 'critical' : 'positive',
            helper: 'Solde consolidé des comptes actifs',
            href: `/app/${companyId}/accounts`,
            explain: explains.cash,
          },
          {
            label: 'Dettes ouvertes',
            value: formatCurrency(totalOpenDebt, company.default_currency),
            tone: 'neutral',
            helper: `${openDebts.length} dette(s) ouverte(s)`,
            href: `/app/${companyId}/debts`,
            explain: explains.openDebts,
          },
          {
            label: 'En retard',
            value: String(overdueDebts.length),
            tone: overdueDebts.length > 0 ? 'critical' : 'neutral',
            helper: 'Dettes dont l’échéance est dépassée',
            href: `/app/${companyId}/debts?status=overdue`,
            explain: explains.overdue,
          },
          {
            label: 'Revenus attendus ce mois',
            value: formatCurrency(revenueStats.expectedThisMonth, company.default_currency),
            tone: 'info',
            helper: 'Projection contractuelle du mois',
            href: `/app/${companyId}/revenues`,
            explain: explains.expectedRevenue,
          },
          {
            label: 'Revenus reçus ce mois',
            value: formatCurrency(revenueStats.receivedThisMonth, company.default_currency),
            tone: 'positive',
            helper: 'Encaissements réellement constatés',
            href: `/app/${companyId}/revenues`,
            explain: explains.receivedRevenue,
          },
          {
            label: 'Projection nette',
            value: formatCurrency(netProjection, company.default_currency),
            tone: netProjection < 0 ? 'critical' : 'neutral',
            helper: 'Revenus attendus moins dettes ouvertes',
            href: `/app/${companyId}/forecast`,
            explain: explains.netProjection,
          },
        ].map(({ label, value, tone, helper, href, explain }) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            tone={tone as 'neutral' | 'positive' | 'warning' | 'critical' | 'info'}
            helper={helper}
            href={href}
            explain={explain}
          />
        ))}
      </div>

      <SectionBlock
        title="Projection de trésorerie"
        subtitle="Lecture immédiate du risque à court terme."
        explain={KPI_EXPLAIN.sectionProjectionTreasury()}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            label={currentMonthYearLabel}
            value={formatCurrency(endOfMonthProjected, company.default_currency)}
            tone={endOfMonthProjected < 0 ? 'critical' : 'neutral'}
            helper={endOfMonthProjected < 0 ? 'Risque de trésorerie négative' : 'Projection à la fin du mois en cours'}
            href={`/app/${companyId}/forecast`}
            explain={explains.projectionEnd}
          />
          <MetricCard
            label={nextMonthYearLabel}
            value={formatCurrency(nextMonthIsolatedClosing ?? endOfMonthProjected, company.default_currency)}
            tone={nextMonthIsolatedClosing != null && nextMonthIsolatedClosing < 0 ? 'critical' : 'neutral'}
            helper="À partir de la trésorerie actuelle : seules les échéances et encaissements prévus ce mois-là (y compris récurrents simulés)."
            href={`/app/${companyId}/forecast`}
            explain={explains.projectionNext}
          />
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <div>
                <p className="section-label mb-2">Action rapide</p>
                <p className="text-sm text-zinc-300">Consulte la prévision détaillée, les breakdowns et les avertissements de fiabilité.</p>
              </div>
              <Link href={`/app/${companyId}/forecast`} className="mt-4 text-sm font-medium text-white hover:text-zinc-300">
                Voir la prévision complète →
              </Link>
            </CardContent>
          </Card>
        </div>
      </SectionBlock>

      <SectionBlock title="Alertes prioritaires" subtitle="Le centre de vigilance de la société.">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            label="Critiques"
            value={String(alertsResult.critical)}
            tone="critical"
            href={`/app/${companyId}/alerts`}
            explain={explains.alertsCritical}
          />
          <MetricCard
            label="Avertissements"
            value={String(alertsResult.warnings)}
            tone="warning"
            href={`/app/${companyId}/alerts`}
            explain={explains.alertsWarnings}
          />
          <MetricCard
            label="Infos"
            value={String(alertsResult.infos)}
            tone="info"
            href={`/app/${companyId}/alerts`}
            explain={explains.alertsInfos}
          />
        </div>
        <AlertsList alerts={alertsResult.alerts.slice(0, 5)} companyId={companyId} />
      </SectionBlock>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock title="Comptes" subtitle="Visibilité directe sur les soldes actifs." explain={KPI_EXPLAIN.sectionAccountsPreview()}>
          <div className="space-y-2">
            {accountsList.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                <div>
                  <p className="text-sm text-zinc-200">{a.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{a.account_type} · {a.currency_code}</p>
                </div>
                <p className={`text-sm font-mono font-semibold ${Number(a.computed_balance ?? a.opening_balance) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCurrency(Number(a.computed_balance ?? a.opening_balance), a.currency_code)}
                </p>
              </div>
            ))}
            {accountsList.length === 0 && (
              <p className="text-xs text-zinc-500 py-2">Aucun compte</p>
            )}
          </div>
          <div className="mt-4">
            <Link href={`/app/${companyId}/accounts`} className="text-xs text-white hover:text-zinc-300">
              Voir tous les comptes →
            </Link>
          </div>
        </SectionBlock>

        <SectionBlock
          title="Dettes prioritaires"
          subtitle="Les sorties qui exigent le plus d’attention."
          explain={KPI_EXPLAIN.sectionPriorityDebts()}
        >
          <div className="space-y-2">
            {debtsRows
              .filter((d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled')
              .slice(0, 5)
              .map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{d.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-500">
                      {formatDate(d.due_date)}
                    </p>
                    {d.computed_status === 'overdue' && (
                      <Badge variant="destructive" className="text-[9px] h-3.5">retard</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm font-mono font-semibold text-white ml-3">
                  {formatCurrency(Number(d.remaining_company_currency), company.default_currency)}
                </p>
              </div>
            ))}
            {openDebts.length === 0 && (
              <p className="text-xs text-zinc-500 py-2">Aucune dette ouverte</p>
            )}
          </div>
          <div className="mt-4">
            <Link href={`/app/${companyId}/debts`} className="text-xs text-white hover:text-zinc-300">
              Voir toutes les dettes →
            </Link>
          </div>
        </SectionBlock>
      </div>
    </div>
  )
}
