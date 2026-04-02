'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DebtAgingRow } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface DebtAgingTableProps {
  data: DebtAgingRow[]
  currency: string
  title?: string
}

export function DebtAgingTable({ data, currency, title = 'Âge des dettes' }: DebtAgingTableProps) {
  const hasAny = data.some((r) => r.count > 0 || r.totalRemaining > 0)

  if (!hasAny) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-zinc-500 text-sm py-6">
          Aucune dette ouverte
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
                  Période
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Nombre
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Montant restant
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {data.map((row) => (
                <tr key={row.bucket} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-zinc-200">{row.label}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{row.count}</td>
                  <td className={`px-4 py-3 text-right font-mono ${row.totalRemaining > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {formatCurrency(row.totalRemaining, currency)}
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
