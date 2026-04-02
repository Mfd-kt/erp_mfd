'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { CashFlowMonth } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

interface CashFlowChartProps {
  data: CashFlowMonth[]
  currency: string
  title?: string
}

export function CashFlowChart({ data, currency, title = 'Trésorerie par mois' }: CashFlowChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    month: d.label,
  }))

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-zinc-500 text-sm">
          Aucune donnée sur la période
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
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="month"
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
                formatter={(value: number, name: string) => [
                  formatCurrency(value, currency),
                  name === 'inflows' ? 'Entrées' : name === 'outflows' ? 'Sorties' : 'Net',
                ]}
              />
              <ReferenceLine y={0} stroke="#52525b" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="inflows" stroke="#10b981" strokeWidth={2} name="Entrées" dot={{ fill: '#10b981' }} />
              <Line type="monotone" dataKey="outflows" stroke="#ef4444" strokeWidth={2} name="Sorties" dot={{ fill: '#ef4444' }} />
              <Line type="monotone" dataKey="netCash" stroke="#3b82f6" strokeWidth={2} name="Net" dot={{ fill: '#3b82f6' }} strokeDasharray="4 2" />
              <Legend
                formatter={(value) => (
                  <span className="text-zinc-300 text-xs">
                    {value === 'inflows' ? 'Entrées' : value === 'outflows' ? 'Sorties' : 'Net'}
                  </span>
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
