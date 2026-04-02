'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ForecastPeriod, GroupCompanyPeriodContribution, GroupForecastPeriod } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function formatDateFr(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function isGroupPeriod(p: ForecastPeriod): p is GroupForecastPeriod {
  return 'byCompany' in p && Array.isArray((p as GroupForecastPeriod).byCompany)
}

export function ForecastPeriodDetailDialog({
  open,
  onOpenChange,
  period,
  currency,
  forecastCompanyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: ForecastPeriod | null
  currency: string
  /** Secours pour les liens revenu (ex. prévision société depuis /app/[companyId]/forecast). */
  forecastCompanyId?: string
}) {
  const router = useRouter()
  if (!period) return null

  const ib = period.inflowsBreakdown
  const ob = period.outflowsBreakdown
  const group = isGroupPeriod(period)
  const byCompany = group ? (period.byCompany ?? []) : []
  const revenueLines = ib?.revenueLines ?? []
  const showCompanyCol = group && revenueLines.some((l) => l.companyName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg text-white">Détail — {period.label}</DialogTitle>
          <DialogDescription className="text-left text-zinc-400">
            Période du {formatDateFr(period.startDate)} au {formatDateFr(period.endDate)}
            {group ? (
              <span className="block mt-1 text-xs text-zinc-500">
                Montants consolidés en {currency} (conversion avec le taux en vigueur à la fin de chaque mois).
              </span>
            ) : (
              <span className="block mt-1 text-xs text-zinc-500">Montants en devise société ({currency}).</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Synthèse */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2">Synthèse du mois</p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/80">
              {[
                ['Ouverture', period.openingCash],
                ['Entrées attendues', period.expectedInflows],
                ['Sorties attendues', period.expectedOutflows],
                ['Flux net', period.netCashFlow],
                ['Clôture projetée', period.closingCashProjected],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between gap-4 px-3 py-2">
                  <span className="text-zinc-400">{label}</span>
                  <span
                    className={`font-mono font-semibold ${
                      label === 'Sorties attendues'
                        ? 'text-red-400'
                        : label === 'Entrées attendues'
                          ? 'text-emerald-400'
                          : label === 'Flux net'
                            ? Number(val) >= 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                            : label === 'Clôture projetée' && Number(val) < 0
                              ? 'text-red-400'
                              : 'text-white'
                    }`}
                  >
                    {formatCurrency(Number(val), currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Détail entrées */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2">Entrées — composition</p>
            <p className="text-xs text-zinc-500 mb-3">
              Revenus dont la <strong className="text-zinc-300">date d’encaissement prévue</strong> tombe dans ce mois
              (hors annulés). La colonne « Reliquat » est ce qui entre dans la prévision (positif seulement) : attendu −
              déjà reçu. <span className="text-zinc-400">Cliquez une ligne pour ouvrir la fiche et modifier le revenu.</span>
            </p>
            {revenueLines.length > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden [&_[data-slot=table-container]]:overflow-visible">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      {showCompanyCol ? (
                        <TableHead className="text-zinc-500 text-[10px] uppercase tracking-wider">Société</TableHead>
                      ) : null}
                      <TableHead className="text-zinc-500 text-[10px] uppercase tracking-wider">Revenu</TableHead>
                      <TableHead className="text-zinc-500 text-[10px] uppercase tracking-wider text-right">
                        Date prévue
                      </TableHead>
                      <TableHead className="text-zinc-500 text-[10px] uppercase tracking-wider text-right">Attendu</TableHead>
                      <TableHead className="text-zinc-500 text-[10px] uppercase tracking-wider text-right">Reçu</TableHead>
                      <TableHead className="text-zinc-500 text-[10px] uppercase tracking-wider text-right">Reliquat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueLines.map((line) => {
                      const cid = line.companyId ?? forecastCompanyId
                      const href = cid ? `/app/${cid}/revenues/${line.id}` : null
                      const canNavigate = Boolean(href)
                      return (
                        <TableRow
                          key={`${cid ?? 'x'}-${line.id}`}
                          className={
                            canNavigate
                              ? 'border-zinc-800/80 cursor-pointer hover:bg-zinc-800/50 transition-colors'
                              : 'border-zinc-800/80 opacity-60'
                          }
                          tabIndex={canNavigate ? 0 : undefined}
                          role={canNavigate ? 'button' : undefined}
                          aria-label={
                            canNavigate
                              ? `Ouvrir le revenu « ${line.title} » pour modification`
                              : `Revenu « ${line.title} » — lien indisponible`
                          }
                          title={canNavigate ? 'Ouvrir la fiche revenu pour modifier' : undefined}
                          onClick={() => href && router.push(href)}
                          onKeyDown={(e) => {
                            if (!href) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              router.push(href)
                            }
                          }}
                        >
                          {showCompanyCol ? (
                            <TableCell className="max-w-[140px] text-zinc-300 text-xs align-top whitespace-normal">
                              {line.companyName ?? '—'}
                            </TableCell>
                          ) : null}
                          <TableCell className="max-w-[220px] align-top whitespace-normal">
                            <span
                              className={
                                canNavigate
                                  ? 'text-zinc-200 underline decoration-zinc-600 decoration-dotted underline-offset-2'
                                  : 'text-zinc-200'
                              }
                            >
                              {line.title}
                            </span>
                            {line.sourceName ? (
                              <span className="block text-[11px] text-zinc-500 mt-0.5">{line.sourceName}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-zinc-400 whitespace-nowrap">
                            {formatDateFr(line.expectedDate)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-zinc-300">
                            {formatCurrency(line.amountExpected, currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-zinc-400">
                            {formatCurrency(line.amountReceived, currency)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs font-medium ${
                              line.remainingInForecast > 0 ? 'text-emerald-400' : 'text-zinc-600'
                            }`}
                          >
                            {formatCurrency(line.remainingInForecast, currency)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-900/80">
                      <TableCell
                        colSpan={showCompanyCol ? 5 : 4}
                        className="text-right text-zinc-400 text-xs font-medium uppercase tracking-wide"
                      >
                        Total entrées (reliquat)
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-400">
                        {formatCurrency(period.expectedInflows, currency)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-xs text-zinc-500">
                Aucune ligne de revenu pour ce mois (aucune date d’encaissement prévue dans la période, ou données non
                détaillées).
              </div>
            )}
          </div>

          {/* Détail sorties */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2">Sorties — composition</p>
            <p className="text-xs text-zinc-500 mb-2">
              Sorties = dettes non soldées dont l’échéance est dans le mois + montants récurrents simulés lorsqu’aucune dette
              générée n’existe encore pour la période.
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/80">
              <div className="flex justify-between gap-4 px-3 py-2">
                <span className="text-zinc-300">Dettes à payer (échéance dans le mois)</span>
                <span className="font-mono text-red-400">{formatCurrency(ob?.debtsDue ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between gap-4 px-3 py-2">
                <span className="text-zinc-300">Récurrents simulés (sans double comptage)</span>
                <span className="font-mono text-red-400">{formatCurrency(ob?.recurringSimulated ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between gap-4 px-3 py-2 border-t border-zinc-800">
                <span className="text-zinc-400">Total sorties</span>
                <span className="font-mono font-semibold text-red-400">
                  {formatCurrency(period.expectedOutflows, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Par société (groupe uniquement) */}
          {group && byCompany.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
                Détail par société (devise du groupe)
              </p>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="px-2 py-2">Société</th>
                      <th className="px-2 py-2 text-right">Ouverture</th>
                      <th className="px-2 py-2 text-right">Entrées</th>
                      <th className="px-2 py-2 text-right">Sorties</th>
                      <th className="px-2 py-2 text-right">Net</th>
                      <th className="px-2 py-2 text-right">Clôture</th>
                      <th className="px-2 py-2 text-center">Taux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {byCompany.map((row: GroupCompanyPeriodContribution) => (
                      <tr key={row.companyId} className={row.included === false ? 'opacity-60' : ''}>
                        <td className="px-2 py-2 text-zinc-200">
                          {row.companyName}
                          <span className="block text-[10px] text-zinc-500">{row.currency}</span>
                        </td>
                        {row.included === false ? (
                          <td colSpan={6} className="px-2 py-2 text-amber-400/90 text-center">
                            Exclue de la consolidation — taux {row.currency} → {currency} manquant
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-2 text-right font-mono text-zinc-300">
                              {formatCurrency(row.openingCashBase, currency)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-emerald-400">
                              {formatCurrency(row.expectedInflowsBase, currency)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-red-400">
                              {formatCurrency(row.expectedOutflowsBase, currency)}
                            </td>
                            <td
                              className={`px-2 py-2 text-right font-mono font-medium ${
                                row.netCashFlowBase >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {formatCurrency(row.netCashFlowBase, currency)}
                            </td>
                            <td
                              className={`px-2 py-2 text-right font-mono font-semibold ${
                                row.closingCashProjected < 0 ? 'text-red-400' : 'text-white'
                              }`}
                            >
                              {formatCurrency(row.closingCashProjected, currency)}
                            </td>
                            <td className="px-2 py-2 text-center font-mono text-[10px] text-zinc-500">
                              {row.fxRate != null ? row.fxRate.toFixed(6) : '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Pour chaque ligne : les montants de la prévision société sont multipliés par le taux {currency} affiché
                (dernier taux avec date d’effet ≤ fin du mois).
              </p>
            </div>
          ) : null}

          {period.currencyConversionWarnings && period.currencyConversionWarnings.length > 0 ? (
            <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              <p className="font-medium text-amber-100">Avertissements de change</p>
              <ul className="mt-1 list-inside list-disc">
                {period.currencyConversionWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
