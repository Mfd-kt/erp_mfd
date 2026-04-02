'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { TopRiskDebt } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

interface TopRisksTableProps {
  risks: TopRiskDebt[]
  currency: string
  companyId?: string
  title?: string
}

export function TopRisksTable({
  risks,
  currency,
  companyId,
  title = 'Principaux risques',
}: TopRisksTableProps) {
  if (risks.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-zinc-500 text-sm py-6">
          Aucun risque identifié
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Dette
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Échéance
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Restant
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {risks.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    {companyId ? (
                      <Link
                        href={`/app/${companyId}/debts/${r.id}`}
                        className="font-medium text-zinc-200 hover:text-blue-400"
                      >
                        {r.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-zinc-200">{r.title}</span>
                    )}
                    {r.creditorName && (
                      <p className="text-xs text-zinc-500 mt-0.5">{r.creditorName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatDate(r.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-400">
                    {formatCurrency(r.remaining, currency)}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'overdue' ? (
                      <Badge variant="destructive" className="text-[10px]">En retard</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400">À échéance</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
