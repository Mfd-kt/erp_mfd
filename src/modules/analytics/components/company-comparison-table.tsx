'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GroupAnalytics } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface CompanyComparisonTableProps {
  byCompany: GroupAnalytics['byCompany']
  title?: string
}

export function CompanyComparisonTable({
  byCompany,
  title = 'Comparatif par société',
}: CompanyComparisonTableProps) {
  if (byCompany.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-zinc-500 text-sm py-6">
          Aucune société
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
                  Société
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Dépenses
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Revenus
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                  Dettes en retard
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {byCompany.map((c) => (
                <tr key={c.companyId} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-200">{c.companyName}</span>
                    {c.countryCode && (
                      <span className="ml-2 text-xs text-zinc-500">{c.countryCode}</span>
                    )}
                    <span className="ml-2 text-xs text-zinc-500 font-mono">{c.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">
                    {formatCurrency(c.totalExpenses, c.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                    {formatCurrency(c.totalRevenues, c.currency)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${c.overdueDebts > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {formatCurrency(c.overdueDebts, c.currency)}
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
