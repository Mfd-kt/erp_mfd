'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { CashTensionPoint } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface CashTensionChartProps {
  data: CashTensionPoint[]
  currency: string
}

export function CashTensionChart({ data, currency }: CashTensionChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    projectedCash: d.projectedCash,
    isLowest: d.isLowest,
  }))

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">Tension de trésorerie</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px] text-zinc-500 text-sm">
          Aucune donnée sur la période
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300">Trésorerie projetée</CardTitle>
        <p className="text-xs text-zinc-500">Évolution consolidée sur la période sélectionnée</p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#52525b' }}
              />
              <YAxis
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#52525b' }}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#e4e4e7' }}
                formatter={(value: number) => [formatCurrency(value, currency), 'Trésorerie projetée']}
              />
              <ReferenceLine y={0} stroke="#52525b" strokeDasharray="2 2" />
              <Bar dataKey="projectedCash" name="Trésorerie projetée" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isLowest && entry.projectedCash < 0 ? '#ef4444' : entry.isLowest ? '#f59e0b' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
