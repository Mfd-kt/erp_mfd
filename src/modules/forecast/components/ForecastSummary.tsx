'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ClickableMetricCard } from '@/modules/group-dashboard/components/ClickableMetricCard'
import { DataExplainDialog } from '@/modules/group-dashboard/components/DataExplainDialog'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { ForecastPeriod } from '../types'
import type { GroupForecastSummaryExplains } from '../build-payloads'
import { sumFollowingSixMonthsOutflows } from '../cushion'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface ForecastSummaryProps {
  periods: ForecastPeriod[]
  currency: string
  incomplete?: boolean
  missingExchangeRates?: string[]
  /** Popups détail calcul (prévision groupe ou société). Absent = cartes non cliquables. */
  explains?: GroupForecastSummaryExplains
}

export function ForecastSummary({
  periods,
  currency,
  incomplete,
  missingExchangeRates,
  explains,
}: ForecastSummaryProps) {
  const [explain, setExplain] = useState<GroupExplainPayload | null>(null)

  if (periods.length === 0) return null
  const current = periods[0]!
  const next = periods[1]
  const last = periods[periods.length - 1]!
  const isNegative = (p: ForecastPeriod) => p.closingCashProjected < 0

  const cushion0 = sumFollowingSixMonthsOutflows(periods, 0)
  const horsMatelas0 =
    cushion0.monthsCounted === 0 ? current.closingCashProjected : current.closingCashProjected - cushion0.sum

  const useInteractive = Boolean(explains)
  const ex = explains

  const matelasValue =
    cushion0.monthsCounted === 0 ? '—' : formatCurrency(cushion0.sum, currency)
  const matelasHelper =
    cushion0.monthsCounted === 0
      ? 'Aucun mois suivant dans la prévision'
      : cushion0.monthsCounted < 6
        ? `Somme sur ${cushion0.monthsCounted} mois`
        : 'Sorties des 6 mois après le mois en cours'

  const horsTone = horsMatelas0 >= 0 ? 'positive' : 'critical'
  const horsHelper =
    horsMatelas0 >= 0
      ? 'Au-dessus du besoin réservé (6 mois de sorties)'
      : 'En dessous du matelas requis — risque de tension'

  return (
    <div className="space-y-4">
      {incomplete && missingExchangeRates && missingExchangeRates.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Prévision groupe incomplète</p>
          <p className="mt-1 text-amber-200/95">
            Il manque un ou plusieurs taux pour convertir vers <span className="font-mono">{currency}</span>
            &nbsp;: {missingExchangeRates.join(' · ')}. Les entités en devise non convertie ne sont pas incluses dans les totaux ci‑dessous.
            <span className="block mt-1 text-xs text-amber-300/90">
              Taux appliqués : dernier enregistrement avec date d’effet ≤ fin de chaque mois prévu (pour inclure les taux publiés en cours de mois).
            </span>
          </p>
          <p className="mt-2">
            <Link
              href="/app/exchange-rates"
              className="inline-flex font-medium text-amber-50 underline decoration-amber-500/60 underline-offset-2 hover:text-white"
            >
              Gérer les taux de change
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-5">
        <section>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Trésorerie projetée (clôture)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {useInteractive && ex ? (
              <>
                <div className={isNegative(current) ? 'rounded-xl ring-1 ring-red-500/40' : ''}>
                  <ClickableMetricCard
                    label="Fin du mois en cours"
                    value={formatCurrency(current.closingCashProjected, currency)}
                    tone={isNegative(current) ? 'critical' : 'neutral'}
                    helper={current.label}
                    explain={ex.currentMonth}
                    onOpenExplain={setExplain}
                  />
                </div>
                {next && ex.nextMonth && (
                  <div className={isNegative(next) ? 'rounded-xl ring-1 ring-red-500/40' : ''}>
                    <ClickableMetricCard
                      label="Mois prochain"
                      value={formatCurrency(next.closingCashProjected, currency)}
                      tone={isNegative(next) ? 'critical' : 'neutral'}
                      helper={next.label}
                      explain={ex.nextMonth}
                      onOpenExplain={setExplain}
                    />
                  </div>
                )}
                {last && last !== current && ex.endOfHorizon && (
                  <div className={last.closingCashProjected < 0 ? 'rounded-xl ring-1 ring-red-500/40' : ''}>
                    <ClickableMetricCard
                      label="Fin de période"
                      value={formatCurrency(last.closingCashProjected, currency)}
                      tone={last.closingCashProjected < 0 ? 'critical' : 'neutral'}
                      helper={last.label}
                      explain={ex.endOfHorizon}
                      onOpenExplain={setExplain}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <Card className={`border-zinc-800 bg-zinc-900 ${isNegative(current) ? 'border-red-500/50' : ''}`}>
                  <CardContent className="p-4">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Fin du mois en cours
                    </p>
                    <p className={`text-xl font-bold ${current.closingCashProjected < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(current.closingCashProjected, currency)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{current.label}</p>
                    {isNegative(current) && <p className="mt-1 text-xs text-red-400">Trésorerie négative projetée</p>}
                  </CardContent>
                </Card>
                {next && (
                  <Card className={`border-zinc-800 bg-zinc-900 ${isNegative(next) ? 'border-red-500/50' : ''}`}>
                    <CardContent className="p-4">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Mois prochain</p>
                      <p className={`text-xl font-bold ${next.closingCashProjected < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatCurrency(next.closingCashProjected, currency)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{next.label}</p>
                      {isNegative(next) && <p className="mt-1 text-xs text-red-400">Trésorerie négative projetée</p>}
                    </CardContent>
                  </Card>
                )}
                {last && last !== current && (
                  <Card className="border-zinc-800 bg-zinc-900">
                    <CardContent className="p-4">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Fin de période</p>
                      <p className={`text-xl font-bold ${last.closingCashProjected < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatCurrency(last.closingCashProjected, currency)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{last.label}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
            Réserve 6 mois — fin {current.label}
          </h2>
          <p className="mb-3 text-[11px] text-zinc-500">
            Matelas = somme des sorties des mois suivants (hors mois courant). Hors matelas = clôture de {current.label} − matelas.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {useInteractive && ex?.cushionAfterCurrentMonth && ex?.horsMatelasAfterCurrentMonth ? (
              <>
                <div className="rounded-xl ring-1 ring-amber-500/25 bg-zinc-900/50">
                  <ClickableMetricCard
                    label="Matelas à réserver"
                    value={matelasValue}
                    tone="warning"
                    helper={matelasHelper}
                    explain={ex.cushionAfterCurrentMonth}
                    onOpenExplain={setExplain}
                  />
                </div>
                <div className="rounded-xl ring-1 ring-amber-500/25 bg-zinc-900/50">
                  <ClickableMetricCard
                    label="Trésorerie hors matelas"
                    value={formatCurrency(horsMatelas0, currency)}
                    tone={horsTone}
                    helper={horsHelper}
                    explain={ex.horsMatelasAfterCurrentMonth}
                    onOpenExplain={setExplain}
                  />
                </div>
              </>
            ) : (
              <>
                <Card className="border-amber-500/25 bg-zinc-900/80">
                  <CardContent className="p-4">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-amber-200/90">
                      Matelas à réserver
                    </p>
                    <p className="text-xl font-bold text-amber-200/90">{matelasValue}</p>
                    <p className="mt-1 text-xs text-zinc-500">{matelasHelper}</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/25 bg-zinc-900/80">
                  <CardContent className="p-4">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Trésorerie hors matelas
                    </p>
                    <p className={`text-xl font-bold ${horsMatelas0 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(horsMatelas0, currency)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{horsHelper}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>
      </div>

      {useInteractive && <DataExplainDialog open={explain !== null} onOpenChange={(o) => !o && setExplain(null)} payload={explain} />}
    </div>
  )
}
