import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCompanyAnalytics } from '@/modules/analytics/service'
import { getDateRangeFromParams } from '@/modules/analytics/schema'
import { AnalyticsSummary } from '@/modules/analytics/components/analytics-summary'
import { ExpensesByCategoryChart } from '@/modules/analytics/components/expenses-by-category-chart'
import { ExpensesByCreditorChart } from '@/modules/analytics/components/expenses-by-creditor-chart'
import { CashFlowChart } from '@/modules/analytics/components/cash-flow-chart'
import { DebtAgingTable } from '@/modules/analytics/components/debt-aging-table'
import { TopRisksTable } from '@/modules/analytics/components/top-risks-table'
import { PeriodFilter } from '@/modules/analytics/components/period-filter'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { buildCompanyAnalyticsSummaryExplains } from '@/modules/analytics/build-payloads'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'

export default async function CompanyAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const { companyId } = await params
  const sp = await searchParams
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

  const dateRange = getDateRangeFromParams({
    preset: sp.preset ?? 'last_3_months',
    from: sp.from,
    to: sp.to,
  })
  const preset = (sp.preset === 'custom' || sp.preset === 'current_month' || sp.preset === 'last_6_months' ? sp.preset : 'last_3_months') as 'current_month' | 'last_3_months' | 'last_6_months' | 'custom'

  const analytics = await getCompanyAnalytics(
    supabase,
    companyId,
    company.trade_name ?? company.legal_name,
    company.default_currency,
    dateRange,
    company.country_code
  )

  const analyticsExplains = buildCompanyAnalyticsSummaryExplains(analytics)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Analytique"
        subtitle={`${company.trade_name ?? company.legal_name} · ${company.default_currency}`}
        explain={KPI_EXPLAIN.pageAnalytics()}
        rightSlot={
          <PeriodFilter
            currentPreset={preset}
            from={dateRange.from}
            to={dateRange.to}
          />
        }
      />

      <p className="text-xs text-zinc-500">
        {dateRange.from} → {dateRange.to}
      </p>

      <AnalyticsSummary summary={analytics.summary} currency={analytics.currency} explains={analyticsExplains} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock
          title="Dépenses par catégorie"
          subtitle="Lecture de la structure de coûts."
          explain={KPI_EXPLAIN.sectionAnalyticsCategory()}
        >
          <ExpensesByCategoryChart
            data={analytics.expensesByCategory}
            currency={analytics.currency}
          />
        </SectionBlock>
        <SectionBlock
          title="Dépenses par créancier"
          subtitle="Concentration des flux et encours."
          explain={KPI_EXPLAIN.sectionAnalyticsCreditor()}
        >
          <ExpensesByCreditorChart
            data={analytics.expensesByCreditor}
            currency={analytics.currency}
            maxBars={10}
          />
        </SectionBlock>
      </div>

      <SectionBlock
        title="Cash flow historique"
        subtitle="Entrées et sorties réellement constatées par mois."
        explain={KPI_EXPLAIN.sectionAnalyticsCashFlow()}
      >
        <CashFlowChart data={analytics.cashFlowByMonth} currency={analytics.currency} />
      </SectionBlock>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock
          title="Âge des dettes"
          subtitle="Vision immédiate de l’échéancier de risque."
          explain={KPI_EXPLAIN.sectionAnalyticsAging()}
        >
          <DebtAgingTable data={analytics.debtAging} currency={analytics.currency} />
        </SectionBlock>
        <SectionBlock
          title="Principaux risques"
          subtitle="Priorités financières à traiter."
          explain={KPI_EXPLAIN.sectionAnalyticsRisks()}
        >
          <TopRisksTable
            risks={analytics.topRisks}
            currency={analytics.currency}
            companyId={companyId}
          />
        </SectionBlock>
      </div>
    </div>
  )
}
