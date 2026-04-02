'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ForecastPeriod } from '../types'
import { sumFollowingSixMonthsOutflows } from '../cushion'
import { ForecastPeriodDetailDialog } from './ForecastPeriodDetailDialog'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface ForecastTableProps {
  periods: ForecastPeriod[]
  currency: string
  /** Société courante (URL) : secours pour les liens revenu si companyId manque sur une ligne. */
  forecastCompanyId?: string
  title?: string
  /** When true, show badge "Includes simulated recurring expenses" */
  hasSimulatedRecurring?: boolean
  /** When true, show badge "Includes partially received revenues" */
  hasPartialRevenues?: boolean
}

export function ForecastTable({
  periods,
  currency,
  forecastCompanyId,
  title = 'Prévision de trésorerie',
  hasSimulatedRecurring,
  hasPartialRevenues,
}: ForecastTableProps) {
  const [detailPeriod, setDetailPeriod] = useState<ForecastPeriod | null>(null)
  const hasBadges = hasSimulatedRecurring === true || hasPartialRevenues === true

  const cushionByRow = periods.map((_, i) => sumFollowingSixMonthsOutflows(periods, i))

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
            {hasBadges && (
              <>
                {hasSimulatedRecurring && (
                  <span
                    className="rounded bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                    title="Inclut les dépenses récurrentes simulées (règle sans dette réelle pour la période)."
                  >
                    Sorties récurrentes simulées
                  </span>
                )}
                {hasPartialRevenues && (
                  <span
                    className="rounded bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                    title="Les entrées n'incluent que le reliquat attendu (montant attendu − déjà reçu)."
                  >
                    Revenus partiellement reçus
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Cliquez une ligne pour le détail. Le <span className="text-zinc-400">matelas</span> est la somme des sorties des 6 mois suivants (hors mois courant) ;{' '}
            <span className="text-zinc-400">hors matelas</span> = clôture − matelas (ce qui reste une fois ce besoin réservé).
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th
                    colSpan={5}
                    className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-4 py-2 border-b border-zinc-800/80"
                  >
                    Mouvement
                  </th>
                  <th
                    colSpan={2}
                    className="text-left text-[10px] font-semibold uppercase tracking-wider text-amber-200/70 px-4 py-2 border-b border-zinc-800/80 border-l border-zinc-700"
                  >
                    Réserve (6 mois)
                  </th>
                </tr>
                <tr className="border-b border-zinc-800">
                  {[
                    { label: 'Mois', title: undefined, group: 'm' as const },
                    { label: 'Ouverture', title: undefined, group: 'm' as const },
                    { label: 'Entrées', title: undefined, group: 'm' as const },
                    { label: 'Sorties', title: undefined, group: 'm' as const },
                    { label: 'Clôture', title: 'Ouverture + entrées − sorties', group: 'm' as const },
                    {
                      label: 'Matelas',
                      title:
                        'Sorties prévues sur les 6 mois calendaires suivant ce mois (mois courant exclu). Montant à réserver pour couvrir ces charges ; tronqué si la prévision s’arrête avant 6 mois.',
                      group: 'r' as const,
                    },
                    {
                      label: 'Hors matelas',
                      title: 'Clôture − matelas : trésorerie disponible après avoir « mis de côté » le besoin des 6 mois suivants. Si le matelas est partiel (fin d’horizon), le calcul utilise ce montant partiel.',
                      group: 'r' as const,
                    },
                  ].map((col) => (
                    <th
                      key={col.label}
                      title={col.title}
                      className={`text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3 ${
                        col.group === 'r' ? 'border-l border-zinc-700 bg-zinc-800/40' : ''
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {periods.map((p, rowIndex) => (
                  <tr
                    key={p.startDate}
                    className="cursor-pointer hover:bg-zinc-800/50 transition-colors focus-within:bg-zinc-800/40"
                    onClick={() => setDetailPeriod(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDetailPeriod(p)
                      }
                    }}
                    aria-label={`Détail du mois ${p.label}`}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">{p.label}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{formatCurrency(p.openingCash, currency)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(p.expectedInflows, currency)}</td>
                    <td className="px-4 py-3 font-mono text-red-400">{formatCurrency(p.expectedOutflows, currency)}</td>
                    <td className={`px-4 py-3 font-mono font-semibold ${p.closingCashProjected < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(p.closingCashProjected, currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-200/90 border-l border-zinc-800 bg-zinc-800/20">
                      {(() => {
                        const { sum, monthsCounted } = cushionByRow[rowIndex] ?? { sum: 0, monthsCounted: 0 }
                        if (monthsCounted === 0) {
                          return <span className="text-zinc-500">—</span>
                        }
                        return (
                          <span
                            title={
                              monthsCounted < 6
                                ? `Somme sur ${monthsCounted} mois seulement (fin de la prévision avant 6 mois complets).`
                                : 'Somme des sorties des 6 mois suivants.'
                            }
                          >
                            {formatCurrency(sum, currency)}
                            {monthsCounted < 6 ? (
                              <span className="ml-1 text-[10px] font-normal text-zinc-500" aria-hidden>
                                ({monthsCounted}/6)
                              </span>
                            ) : null}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold border-l border-zinc-800 bg-zinc-800/20">
                      {(() => {
                        const { sum, monthsCounted } = cushionByRow[rowIndex] ?? { sum: 0, monthsCounted: 0 }
                        const hors =
                          monthsCounted === 0 ? p.closingCashProjected : p.closingCashProjected - sum
                        return (
                          <span
                            className={hors >= 0 ? 'text-emerald-400' : 'text-red-400'}
                            title={
                              monthsCounted === 0
                                ? 'Pas de mois suivant dans la prévision : égal à la clôture.'
                                : 'Clôture − matelas (besoin des mois suivants).'
                            }
                          >
                            {formatCurrency(hors, currency)}
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ForecastPeriodDetailDialog
        open={detailPeriod !== null}
        onOpenChange={(o) => {
          if (!o) setDetailPeriod(null)
        }}
        period={detailPeriod}
        currency={currency}
        forecastCompanyId={forecastCompanyId}
      />
    </>
  )
}
