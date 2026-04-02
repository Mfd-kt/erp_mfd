'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ClickableMetricCard } from '@/modules/group-dashboard/components/ClickableMetricCard'
import { DataExplainDialog } from '@/modules/group-dashboard/components/DataExplainDialog'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { AnalyticsSummaryKPIs } from '../types'
import type { GroupAnalyticsSummaryExplains } from '../build-payloads'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface AnalyticsSummaryProps {
  summary: AnalyticsSummaryKPIs
  currency: string
  incomplete?: boolean
  missingExchangeRates?: string[]
  /** Popups « origine du calcul » (Analytique groupe). Absent = cartes simples (vue société). */
  explains?: GroupAnalyticsSummaryExplains
}

export function AnalyticsSummary({
  summary,
  currency,
  incomplete,
  missingExchangeRates,
  explains,
}: AnalyticsSummaryProps) {
  const [explain, setExplain] = useState<GroupExplainPayload | null>(null)

  const plainCards = [
    {
      label: 'Dépenses (période)',
      value: formatCurrency(summary.totalExpenses, currency),
      className: 'text-red-400',
    },
    {
      label: 'Revenus (période)',
      value: formatCurrency(summary.totalRevenues, currency),
      className: 'text-emerald-400',
    },
    {
      label: 'Résultat net',
      value: formatCurrency(summary.netResult, currency),
      className: summary.netResult >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Dettes en retard',
      value: formatCurrency(summary.overdueDebts, currency),
      className: summary.overdueDebts > 0 ? 'text-amber-400' : 'text-zinc-400',
    },
  ]

  const clickableCards = explains
    ? [
        {
          label: 'Dépenses (période)',
          value: formatCurrency(summary.totalExpenses, currency),
          tone: 'critical' as const,
          explain: explains.expenses,
        },
        {
          label: 'Revenus (période)',
          value: formatCurrency(summary.totalRevenues, currency),
          tone: 'positive' as const,
          explain: explains.revenues,
        },
        {
          label: 'Résultat net',
          value: formatCurrency(summary.netResult, currency),
          tone: (summary.netResult >= 0 ? 'positive' : 'critical') as const,
          explain: explains.netResult,
        },
        {
          label: 'Dettes en retard',
          value: formatCurrency(summary.overdueDebts, currency),
          tone: (summary.overdueDebts > 0 ? 'warning' : 'neutral') as const,
          explain: explains.overdue,
        },
      ]
    : null

  return (
    <div className="space-y-4">
      {incomplete && missingExchangeRates && missingExchangeRates.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Analytique groupe incomplète</p>
          <p className="mt-1 text-amber-200/95">
            Il manque un ou plusieurs taux pour convertir vers <span className="font-mono">{currency}</span>
            &nbsp;: {missingExchangeRates.join(' · ')}. Les montants en devise non convertie ne sont pas inclus dans les totaux
            ci‑dessous (référence taux : fin de période sélectionnée).
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
      {clickableCards ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {clickableCards.map(({ label, value, tone, explain: ex }) => (
            <ClickableMetricCard
              key={label}
              label={label}
              value={value}
              tone={tone}
              explain={ex}
              onOpenExplain={setExplain}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {plainCards.map(({ label, value, className }) => (
            <Card key={label} className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-4">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
                <p className={`text-xl font-bold ${className}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {explains ? (
        <DataExplainDialog open={explain !== null} onOpenChange={(o) => !o && setExplain(null)} payload={explain} />
      ) : null}
    </div>
  )
}
