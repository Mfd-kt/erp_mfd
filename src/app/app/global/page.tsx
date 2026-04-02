import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { Badge } from '@/components/ui/badge'
import { getGlobalDashboardData } from '@/modules/global-dashboard/service'
import { parseGlobalSearchParams } from '@/modules/global-dashboard/schema'
import { buildGlobalDashboardExplains } from '@/modules/global-dashboard/build-payloads'
import { GlobalDashboardFilters } from '@/modules/global-dashboard/components/GlobalDashboardFilters'
import { GlobalDashboardKpiSection } from '@/modules/global-dashboard/components/GlobalDashboardKpiSection'
import { CashTensionChart } from '@/modules/global-dashboard/components/CashTensionChart'
import { EntityBreakdownTable } from '@/modules/global-dashboard/components/EntityBreakdownTable'
import { UpcomingObligationsList } from '@/modules/global-dashboard/components/UpcomingObligationsList'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

const SCOPE_LABELS = {
  all: 'Tout (pro + perso)',
  business: 'Professionnel uniquement',
  personal: 'Personnel uniquement',
} as const

export default async function GlobalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const sp = await searchParams
  const { period, scope: scopeFilter } = parseGlobalSearchParams(sp)
  const baseCurrency = scope.group?.base_currency ?? 'EUR'

  const supabase = await createClient()
  const data = await getGlobalDashboardData(
    supabase,
    scope.companies,
    scopeFilter,
    period,
    baseCurrency
  )

  const explains = buildGlobalDashboardExplains(data)

  return (
    <div className="space-y-8 fade-in">
      <HeroPageHeader
        title="Contrôle global"
        subtitle={`Vue consolidée · ${data.companiesIncluded} entité${data.companiesIncluded !== 1 ? 's' : ''} · ${SCOPE_LABELS[scopeFilter]}`}
        rightSlot={
          <div className="flex flex-col gap-3">
            <GlobalDashboardFilters period={period} scope={scopeFilter} />
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                Consolidation : <span className="font-mono text-zinc-300">{baseCurrency}</span>
              </span>
              {data.incomplete ? (
                <Badge variant="destructive" className="text-[10px]">
                  Taux manquants
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-emerald-600/40 text-emerald-400">
                  Fiable
                </Badge>
              )}
            </div>
          </div>
        }
      />

      {data.incomplete && data.missingExchangeRates.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-medium text-amber-300">
            Prévision incomplète : taux de change manquants ({data.missingExchangeRates.join(', ')})
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Les montants consolidés excluent les entités sans taux.{' '}
            <Link href="/app/exchange-rates" className="font-medium text-amber-400 underline-offset-2 hover:underline">
              Gérer les taux de change
            </Link>
          </p>
        </div>
      )}

      {data.companiesIncluded === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <p className="text-lg font-medium text-zinc-300">Aucune entité dans ce périmètre</p>
          <p className="mt-2 text-sm text-zinc-500">
            Modifiez le filtre « Périmètre » pour inclure des sociétés professionnelles ou personnelles.
          </p>
        </div>
      ) : (
        <>
          <GlobalDashboardKpiSection data={data} explains={explains} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionBlock
                title="Tension de trésorerie"
                subtitle={data.strongestPressurePoint ? `Point de pression : ${data.strongestPressurePoint.label} (${formatCurrency(data.strongestPressurePoint.projectedCash, baseCurrency)})` : 'Évolution projetée sur la période'}
              >
                <CashTensionChart data={data.cashTensionPoints} currency={baseCurrency} />
              </SectionBlock>
            </div>
            <SectionBlock
              title="Obligations à échéance"
              subtitle="Principales échéances et retards"
            >
              <UpcomingObligationsList upcoming={data.upcomingObligations} overdue={data.overdueObligations} />
            </SectionBlock>
          </div>

          <SectionBlock
            title="Répartition par entité"
            subtitle="Trésorerie, dettes et clôture projetée par société"
          >
            <EntityBreakdownTable rows={data.entityBreakdown} baseCurrency={baseCurrency} />
          </SectionBlock>

          <SectionBlock
            title="Retrait sécurisé"
            subtitle="Capacité de retrait après tampon de sécurité"
          >
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-baseline gap-4">
                <p className="metric-value text-3xl text-emerald-400">
                  {formatCurrency(data.safeWithdrawalCapacity, baseCurrency)}
                </p>
                <p className="text-sm text-zinc-500">disponible en retrait sécurisé</p>
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-400">
                <p>
                  <strong className="text-zinc-300">Tampon de sécurité :</strong>{' '}
                  {formatCurrency(data.safetyBuffer, baseCurrency)} (1 mois de charges récurrentes fixes)
                </p>
                <p>
                  <strong className="text-zinc-300">Calcul :</strong> Clôture projetée − tampon de sécurité. Si négatif, affiché à 0.
                </p>
                <p className="text-xs text-zinc-500">
                  Le tampon peut être configuré ultérieurement dans les paramètres.
                </p>
              </div>
            </div>
          </SectionBlock>
        </>
      )}
    </div>
  )
}
