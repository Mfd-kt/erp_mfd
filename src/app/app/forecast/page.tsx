import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { generateGroupForecast } from '@/modules/forecast/service'
import { buildGroupForecastSummaryExplains } from '@/modules/forecast/build-payloads'
import { ForecastTable } from '@/modules/forecast/components/ForecastTable'
import { ForecastChart } from '@/modules/forecast/components/ForecastChart'
import { ForecastSummary } from '@/modules/forecast/components/ForecastSummary'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { getForecastMonthsUntilDecember } from '@/modules/forecast/schema'

export default async function GroupForecastPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.group) redirect('/app')

  const supabase = await createClient()
  const forecastMonths = getForecastMonthsUntilDecember()
  const forecast = await generateGroupForecast(
    supabase,
    scope.companies,
    scope.group.id,
    scope.group.base_currency,
    forecastMonths
  )

  const explains = buildGroupForecastSummaryExplains(forecast)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Prévision groupe"
        subtitle={`Consolidation en ${forecast.conversionCurrency} · ${forecast.companiesIncluded} entité${forecast.companiesIncluded !== 1 ? 's' : ''} incluse${forecast.companiesIncluded !== 1 ? 's' : ''}`}
      />

      <ForecastSummary
        periods={forecast.periods}
        currency={forecast.baseCurrency}
        incomplete={forecast.incomplete}
        missingExchangeRates={forecast.missingExchangeRates}
        explains={explains}
      />
      <SectionBlock
        title="Évolution consolidée"
        subtitle={`Projection multi-sociétés jusqu’à décembre (${forecastMonths} mois).`}
      >
        <ForecastChart periods={forecast.periods} currency={forecast.baseCurrency} />
      </SectionBlock>
      <SectionBlock title="Prévision consolidée" subtitle="Agrégation groupe, avec avertissements FX si nécessaires.">
        <ForecastTable
          periods={forecast.periods}
          currency={forecast.baseCurrency}
          title="Prévision consolidée"
        />
      </SectionBlock>
    </div>
  )
}
