import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { getGroupAnalytics } from '@/modules/analytics/service'
import { buildGroupAnalyticsSummaryExplains } from '@/modules/analytics/build-payloads'
import { getDateRangeFromParams } from '@/modules/analytics/schema'
import { AnalyticsSummary } from '@/modules/analytics/components/analytics-summary'
import { ExpensesByCategoryChart } from '@/modules/analytics/components/expenses-by-category-chart'
import { ExpensesByCreditorChart } from '@/modules/analytics/components/expenses-by-creditor-chart'
import { CashFlowChart } from '@/modules/analytics/components/cash-flow-chart'
import { DebtAgingTable } from '@/modules/analytics/components/debt-aging-table'
import { TopRisksTable } from '@/modules/analytics/components/top-risks-table'
import { CompanyComparisonTable } from '@/modules/analytics/components/company-comparison-table'
import { PeriodFilter } from '@/modules/analytics/components/period-filter'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'

export default async function GroupAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.group) redirect('/app')

  const sp = await searchParams
  const supabase = await createClient()
  const dateRange = getDateRangeFromParams({
    preset: sp.preset ?? 'last_3_months',
    from: sp.from,
    to: sp.to,
  })
  const preset = (sp.preset === 'custom' || sp.preset === 'current_month' || sp.preset === 'last_6_months' ? sp.preset : 'last_3_months') as 'current_month' | 'last_3_months' | 'last_6_months' | 'custom'

  const analytics = await getGroupAnalytics(
    supabase,
    scope.companies,
    scope.group.id,
    scope.group.base_currency,
    dateRange
  )

  const analyticsExplains = buildGroupAnalyticsSummaryExplains(analytics)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Analytique groupe"
        subtitle={`${analytics.companiesIncluded} entité${analytics.companiesIncluded !== 1 ? 's' : ''} · Consolidation en ${analytics.baseCurrency}`}
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

      <AnalyticsSummary
        summary={analytics.summary}
        currency={analytics.baseCurrency}
        incomplete={analytics.incomplete}
        missingExchangeRates={analytics.missingExchangeRates}
        explains={analyticsExplains}
      />

      <SectionBlock title="Comparatif sociétés" subtitle="Comparer les performances et les risques par entité.">
        <CompanyComparisonTable byCompany={analytics.byCompany} />
      </SectionBlock>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock title="Dépenses par catégorie" subtitle="Vue consolidée de la structure de coûts.">
          <ExpensesByCategoryChart
            data={analytics.expensesByCategory}
            currency={analytics.baseCurrency}
            title="Dépenses par catégorie (consolidé)"
          />
        </SectionBlock>
        <SectionBlock title="Dépenses par créancier" subtitle="Concentration des sorties et encours groupe.">
          <ExpensesByCreditorChart
            data={analytics.expensesByCreditor}
            currency={analytics.baseCurrency}
            title="Dépenses par créancier (consolidé)"
            maxBars={10}
          />
        </SectionBlock>
      </div>

      <SectionBlock title="Cash flow historique" subtitle="Historique consolidé des entrées et sorties.">
        <CashFlowChart
          data={analytics.cashFlowByMonth}
          currency={analytics.baseCurrency}
          title="Trésorerie par mois (consolidé)"
        />
      </SectionBlock>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock title="Âge des dettes" subtitle="Échéancier de risque consolidé.">
          <DebtAgingTable
            data={analytics.debtAging}
            currency={analytics.baseCurrency}
            title="Âge des dettes (consolidé)"
          />
        </SectionBlock>
        <SectionBlock title="Principaux risques" subtitle="Les points de vigilance les plus sensibles du groupe.">
          <TopRisksTable
            risks={analytics.topRisks}
            currency={analytics.baseCurrency}
            title="Principaux risques (groupe)"
          />
        </SectionBlock>
      </div>
    </div>
  )
}
