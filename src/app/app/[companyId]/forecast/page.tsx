import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { generateCompanyForecast } from '@/modules/forecast/service'
import { buildCompanyForecastSummaryExplains } from '@/modules/forecast/build-payloads'
import { ForecastTable } from '@/modules/forecast/components/ForecastTable'
import { ForecastChart } from '@/modules/forecast/components/ForecastChart'
import { ForecastSummary } from '@/modules/forecast/components/ForecastSummary'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { getForecastMonthsUntilDecember } from '@/modules/forecast/schema'
import type { Company } from '@/lib/supabase/types'

export default async function CompanyForecastPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
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

  const forecastMonths = getForecastMonthsUntilDecember()
  const forecast = await generateCompanyForecast(
    supabase,
    companyId,
    company.default_currency,
    forecastMonths
  )

  const explains = buildCompanyForecastSummaryExplains(forecast, company.trade_name ?? company.legal_name)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Prévision de trésorerie"
        subtitle={`${company.trade_name ?? company.legal_name} · ${company.default_currency}`}
        explain={KPI_EXPLAIN.pageForecast()}
      />

      <ForecastSummary periods={forecast.periods} currency={forecast.currency} explains={explains} />
      <SectionBlock
        title="Évolution de trésorerie"
        subtitle={`Projection mois par mois du mois en cours jusqu’à décembre (${forecastMonths} mois).`}
        explain={KPI_EXPLAIN.sectionForecastChart()}
      >
        <ForecastChart periods={forecast.periods} currency={forecast.currency} />
      </SectionBlock>
      <SectionBlock
        title="Prévision détaillée"
        subtitle="Montants calculés côté serveur, sans fallback client. Période : jusqu’à la fin décembre."
        explain={KPI_EXPLAIN.sectionForecastTable()}
      >
        <ForecastTable
          periods={forecast.periods}
          currency={forecast.currency}
          forecastCompanyId={companyId}
          hasSimulatedRecurring={forecast.hasSimulatedRecurring}
          hasPartialRevenues={forecast.hasPartialRevenues}
        />
      </SectionBlock>
    </div>
  )
}
