'use client'

import { HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { GroupExplainPayload } from '../types'

type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'info'

const toneClass: Record<Tone, string> = {
  neutral: 'text-zinc-100',
  positive: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  info: 'text-blue-400',
}

interface ClickableMetricCardProps {
  label: string
  value: string
  tone?: Tone
  helper?: string
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  explain: GroupExplainPayload
  onOpenExplain: (payload: GroupExplainPayload) => void
}

export function ClickableMetricCard({
  label,
  value,
  tone = 'neutral',
  helper,
  trend,
  trendLabel,
  explain,
  onOpenExplain,
}: ClickableMetricCardProps) {
  function open() {
    onOpenExplain(explain)
  }

  return (
    <Card className="border-zinc-800/80 bg-zinc-950 shadow-none transition-colors hover:border-amber-600/40">
      <CardContent className="p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="section-label">{label}</p>
          <button
            type="button"
            onClick={open}
            className="shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-amber-400"
            aria-label={`Détail du calcul : ${label}`}
            title="Détail du calcul"
          >
            <HelpCircle size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={open}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-md -m-1 p-1"
        >
          <p
            className={cn(
              'metric-value cursor-pointer hover:underline decoration-dotted underline-offset-4',
              toneClass[tone]
            )}
          >
            {value}
          </p>
        </button>
        {helper ? (
          <button
            type="button"
            onClick={open}
            className="mt-2 w-full text-left text-xs text-zinc-500 hover:text-zinc-400"
          >
            {helper}
          </button>
        ) : null}
        {trend ? (
          <p className="mt-1 text-[11px] text-zinc-600">
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel ?? 'Tendance stable'}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
