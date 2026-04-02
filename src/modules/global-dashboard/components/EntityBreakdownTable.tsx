'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { EntityBreakdownRow } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface EntityBreakdownTableProps {
  rows: EntityBreakdownRow[]
  baseCurrency: string
}

export function EntityBreakdownTable({ rows, baseCurrency }: EntityBreakdownTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
        <p className="text-sm text-zinc-500">Aucune entité dans le périmètre sélectionné</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/70">
            <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Entité
            </th>
            <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Type
            </th>
            <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Trésorerie
            </th>
            <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Dettes ouvertes
            </th>
            <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              À recevoir
            </th>
            <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Clôture 30j
            </th>
            <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {rows.map((row) => (
            <tr key={row.companyId} className="interactive-row">
              <td className="px-4 py-4 font-medium text-zinc-100">
                <Link href={`/app/${row.companyId}/dashboard`} className="hover:text-white hover:underline">
                  {row.companyName}
                </Link>
              </td>
              <td className="px-4 py-4">
                {row.type === 'personal' ? (
                  <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400">
                    Personnel
                  </Badge>
                ) : (
                  <span className="text-zinc-500 text-xs">Professionnel</span>
                )}
              </td>
              <td className="px-4 py-4 text-right font-mono text-zinc-300">
                {formatCurrency(row.cash, row.currency)}
              </td>
              <td className="px-4 py-4 text-right font-mono text-zinc-300">
                {formatCurrency(row.openDebts, row.currency)}
              </td>
              <td className="px-4 py-4 text-right font-mono text-emerald-400">
                {formatCurrency(row.receivables, row.currency)}
              </td>
              <td className="px-4 py-4 text-right font-mono font-medium text-white">
                {formatCurrency(row.projected30DayClosing, row.currency)}
              </td>
              <td className="px-4 py-4">
                {row.status === 'critical' ? (
                  <Badge variant="destructive" className="text-[10px]">Critique</Badge>
                ) : row.status === 'warning' ? (
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                    Vigilance
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-emerald-600/40 text-emerald-400">
                    OK
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
