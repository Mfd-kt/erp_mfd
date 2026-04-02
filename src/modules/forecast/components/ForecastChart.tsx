'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ForecastPeriod } from '../types'

interface ForecastChartProps {
  periods: ForecastPeriod[]
  currency: string
}

const CHART_HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 56 }

export function ForecastChart({ periods, currency }: ForecastChartProps) {
  if (periods.length === 0) return null

  const allValues = periods.flatMap((p) => [p.openingCash, p.closingCashProjected])
  const min = Math.min(0, ...allValues)
  const max = Math.max(0, ...allValues)
  const range = max - min || 1
  const width = Math.max(300, periods.length * 48)
  const chartWidth = width - PADDING.left - PADDING.right
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const toY = (v: number) => PADDING.top + chartHeight - ((v - min) / range) * chartHeight
  const toX = (i: number) => PADDING.left + (i / Math.max(1, periods.length - 1)) * chartWidth

  const openingPoints = periods.map((p, i) => `${toX(i)},${toY(p.openingCash)}`).join(' ')
  const closingPoints = periods.map((p, i) => `${toX(i)},${toY(p.closingCashProjected)}`).join(' ')

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300">Évolution de la trésorerie</CardTitle>
      </CardHeader>
      <CardContent>
        <svg width={width} height={CHART_HEIGHT} className="overflow-visible">
          {/* Zero line */}
          {min < 0 && max > 0 && (
            <line
              x1={PADDING.left}
              y1={toY(0)}
              x2={width - PADDING.right}
              y2={toY(0)}
              stroke="currentColor"
              strokeDasharray="4 2"
              className="text-zinc-600"
              strokeWidth={1}
            />
          )}
          {/* Opening line */}
          <polyline
            points={openingPoints}
            fill="none"
            stroke="currentColor"
            className="text-blue-400"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Closing line */}
          <polyline
            points={closingPoints}
            fill="none"
            stroke="currentColor"
            className="text-emerald-400"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* X labels */}
          {periods.map((p, i) => (
            <text
              key={p.startDate}
              x={toX(i)}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
              className="fill-zinc-500 text-[10px]"
            >
              {p.label.split(' ')[0]}
            </text>
          ))}
        </svg>
        <div className="flex gap-4 mt-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400 rounded" /> Ouverture
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded" /> Clôture projetée
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
