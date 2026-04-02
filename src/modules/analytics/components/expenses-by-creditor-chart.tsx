'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { ExpenseByCreditor } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface ExpensesByCreditorChartProps {
  data: ExpenseByCreditor[]
  currency: string
  title?: string
  maxBars?: number
}

export function ExpensesByCreditorChart({
  data,
  currency,
  title = 'Dépenses par créancier',
  maxBars = 10,
}: ExpensesByCreditorChartProps) {
  const chartData = data
    .filter((d) => d.totalPaid > 0 || d.outstanding > 0)
    .slice(0, maxBars)
    .map((d) => ({
      name: d.creditorName.length > 18 ? d.creditorName.slice(0, 16) + '…' : d.creditorName,
      fullName: d.creditorName,
      payé: d.totalPaid,
      restant: d.outstanding,
      total: d.totalPaid + d.outstanding,
    }))

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-zinc-500 text-sm">
          Aucun créancier sur la période
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#52525b' }}
              />
              <YAxis
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#52525b' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#e4e4e7' }}
                formatter={(value: number) => [formatCurrency(value, currency), '']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
              />
              <Bar dataKey="payé" fill="#10b981" name="Payé" radius={[2, 2, 0, 0]} />
              <Bar dataKey="restant" fill="#f59e0b" name="Restant dû" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" /> Payé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" /> Restant dû
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
