'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { ExpenseByCategory } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface ExpensesByCategoryChartProps {
  data: ExpenseByCategory[]
  currency: string
  title?: string
}

export function ExpensesByCategoryChart({
  data,
  currency,
  title = 'Dépenses par catégorie',
}: ExpensesByCategoryChartProps) {
  const chartData = data
    .filter((d) => d.total > 0)
    .map((d, i) => ({
      name: d.categoryName.length > 20 ? d.categoryName.slice(0, 18) + '…' : d.categoryName,
      fullName: d.categoryName,
      value: d.total,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))

  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-zinc-500 text-sm">
          Aucune dépense sur la période
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
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                label={({ name, percent }) => (percent >= 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '')}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={chartData[index].fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#e4e4e7' }}
                formatter={(value: number) => [formatCurrency(value, currency), 'Montant']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
              />
              <Legend
                formatter={(_, entry) => (
                  <span className="text-zinc-300 text-xs">
                    {entry.payload?.fullName ?? entry.value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
