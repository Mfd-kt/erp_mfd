'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import type { CreditorDebtTotals } from '@/modules/creditors/queries'
import type { Company, Creditor } from '@/lib/supabase/types'
import { Search } from 'lucide-react'

const ZERO_TOTALS: CreditorDebtTotals = { totalAmount: 0, totalPaid: 0, totalRemaining: 0 }

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

const creditorTypeLabel: Record<string, string> = {
  person: 'Personne',
  company: 'Société',
  employee: 'Employé',
  government: 'Gouvernement',
  landlord: 'Propriétaire',
  bank: 'Banque',
  other: 'Autre',
}

function companyLabel(c: Company) {
  return c.trade_name ?? c.legal_name
}

function creditorCompanyCurrency(cr: Creditor, companyById: Map<string, Company>): string {
  return companyById.get(cr.company_id)?.default_currency ?? 'EUR'
}

export interface GroupCreditorsViewProps {
  companies: Company[]
  creditors: Creditor[]
  totalsByCreditor: Record<string, CreditorDebtTotals>
  /** Totaux groupe par devise (pas d’addition entre devises). */
  totalsByCurrency: Record<string, CreditorDebtTotals>
}

export function GroupCreditorsView({
  companies,
  creditors,
  totalsByCreditor,
  totalsByCurrency,
}: GroupCreditorsViewProps) {
  const [q, setQ] = useState('')

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return creditors
    return creditors.filter((cr) => {
      const comp = companyById.get(cr.company_id)
      const compName = comp ? companyLabel(comp).toLowerCase() : ''
      const typeLabel = (creditorTypeLabel[cr.creditor_type] ?? cr.creditor_type).toLowerCase()
      const haystack = [
        cr.name,
        cr.email ?? '',
        cr.phone ?? '',
        cr.country_code ?? '',
        typeLabel,
        compName,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [creditors, q, companyById])

  const displayTotalsByCurrency = useMemo(() => {
    if (!q.trim()) return totalsByCurrency
    const acc: Record<string, CreditorDebtTotals> = {}
    for (const cr of filtered) {
      const ccy = creditorCompanyCurrency(cr, companyById)
      const t = totalsByCreditor[cr.id] ?? ZERO_TOTALS
      const b = acc[ccy] ?? { ...ZERO_TOTALS }
      b.totalAmount += t.totalAmount
      b.totalPaid += t.totalPaid
      b.totalRemaining += t.totalRemaining
      acc[ccy] = b
    }
    return acc
  }, [q, filtered, totalsByCurrency, totalsByCreditor, companyById])

  const isFiltered = Boolean(q.trim())
  const currencyKeys = useMemo(
    () => Object.keys(displayTotalsByCurrency).sort(),
    [displayTotalsByCurrency],
  )

  return (
    <div className="space-y-6">
      <HeroPageHeader
        title="Créanciers (groupe)"
        subtitle={`${companies.length} société${companies.length !== 1 ? 's' : ''} · ${creditors.length} créancier${creditors.length !== 1 ? 's' : ''} · Montants dans la devise de chaque entité`}
        explain={KPI_EXPLAIN.referentialList('Créanciers')}
      />

      {currencyKeys.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            Totaux par devise — les montants ne sont pas convertis ni additionnés entre devises différentes.
          </p>
          {currencyKeys.map((ccy) => {
            const t = displayTotalsByCurrency[ccy] ?? ZERO_TOTALS
            return (
              <div key={ccy} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{ccy}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MetricCard
                    label="Encours (montants initiaux)"
                    value={formatCurrency(t.totalAmount, ccy)}
                    tone="neutral"
                    explain={KPI_EXPLAIN.debtDetailAmountTotal()}
                  />
                  <MetricCard
                    label="Total payé"
                    value={formatCurrency(t.totalPaid, ccy)}
                    tone="positive"
                    explain={KPI_EXPLAIN.debtDetailPaid()}
                  />
                  <MetricCard
                    label="Restant dû"
                    value={formatCurrency(t.totalRemaining, ccy)}
                    tone={t.totalRemaining > 0 ? 'critical' : 'neutral'}
                    explain={KPI_EXPLAIN.debtDetailRemaining()}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : creditors.length > 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune dette enregistrée sur ce périmètre — les totaux par devise apparaîtront avec les dettes associées.
        </p>
      ) : null}
      {isFiltered ? (
        <p className="text-xs text-zinc-500">
          Totaux sur les résultats affichés ({filtered.length} ligne{filtered.length !== 1 ? 's' : ''}). Effacez la
          recherche pour les totaux sur tout le groupe.
        </p>
      ) : null}

      <SectionBlock
        title="Référentiel consolidé"
        subtitle="Montants en devise société (par entité). Recherche sur le nom, le type, la société, l’email ou le téléphone."
        explain={KPI_EXPLAIN.referentialList('Créanciers')}
      >
        <div className="mb-4">
          <label htmlFor="group-creditors-search" className="sr-only">
            Rechercher un créancier
          </label>
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              id="group-creditors-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par nom, société, email…"
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2 pl-10 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>
          {q.trim() ? (
            <p className="mt-2 text-xs text-zinc-500">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== creditors.length ? ` sur ${creditors.length}` : ''}
            </p>
          ) : null}
        </div>

        {creditors.length === 0 ? (
          <EmptyState
            title="Aucun créancier"
            description="Aucune société du groupe n’a encore de créancier enregistré."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            description="Modifiez votre recherche ou effacez le champ pour tout afficher."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/70 bg-zinc-900/50">
                    {[
                      'Nom',
                      'Société',
                      'Dev.',
                      'Montants init.',
                      'Payé',
                      'Restant',
                      'Type',
                      'Pays',
                      'Email',
                      'Tél.',
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 ${
                          ['Montants init.', 'Payé', 'Restant'].includes(h) ? 'text-right' : ''
                        } ${h === 'Dev.' ? 'w-12' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.map((cr) => {
                    const comp = companyById.get(cr.company_id)
                    const label = comp ? companyLabel(comp) : '—'
                    const t = totalsByCreditor[cr.id] ?? ZERO_TOTALS
                    const ccy = creditorCompanyCurrency(cr, companyById)
                    return (
                      <tr key={cr.id} className="transition-colors hover:bg-zinc-900/60">
                        <td className="px-3 py-2.5 font-medium text-zinc-100">
                          <Link
                            href={`/app/${cr.company_id}/creditors/${cr.id}`}
                            className="transition-colors hover:text-white"
                          >
                            {cr.name}
                          </Link>
                        </td>
                        <td className="max-w-[160px] px-3 py-2.5 text-zinc-400">
                          {comp ? (
                            <Link
                              href={`/app/${cr.company_id}/creditors`}
                              className="truncate text-zinc-400 transition-colors hover:text-zinc-200"
                            >
                              {label}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-zinc-400">{ccy}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm text-zinc-300 tabular-nums">
                          {formatCurrency(t.totalAmount, ccy)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm text-emerald-400/90 tabular-nums">
                          {formatCurrency(t.totalPaid, ccy)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums ${
                            t.totalRemaining > 0 ? 'text-amber-200' : 'text-zinc-300'
                          }`}
                        >
                          {formatCurrency(t.totalRemaining, ccy)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                            {creditorTypeLabel[cr.creditor_type] ?? cr.creditor_type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{cr.country_code ?? '—'}</td>
                        <td className="max-w-[140px] truncate px-3 py-2.5 text-zinc-400">{cr.email ?? '—'}</td>
                        <td className="max-w-[120px] truncate px-3 py-2.5 text-zinc-400">{cr.phone ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
