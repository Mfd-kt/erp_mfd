'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ExplainCalculationTrigger } from '@/components/ui/explain-calculation-trigger'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'

type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'info'

const toneClass: Record<Tone, string> = {
  neutral: 'text-zinc-100',
  positive: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  info: 'text-blue-400',
}

interface MetricCardProps {
  label: string
  value: string
  tone?: Tone
  helper?: string
  /** Si défini, toute la carte est un lien vers cette URL */
  href?: string
  /** Popup « origine du calcul » */
  explain?: GroupExplainPayload
}

export function MetricCard({ label, value, tone = 'neutral', helper, href, explain }: MetricCardProps) {
  const valueBlock = (
    <>
      <p className={cn('metric-value', toneClass[tone])}>{value}</p>
      {helper ? <p className="mt-2 text-xs text-zinc-500">{helper}</p> : null}
    </>
  )

  const headerRow = (
    <div className="mb-3 flex items-start justify-between gap-2">
      <p className="section-label flex-1 min-w-0">{label}</p>
      {explain ? <ExplainCalculationTrigger payload={explain} ariaLabel={`Détail du calcul : ${label}`} /> : null}
    </div>
  )

  const card = (
    <Card
      className={cn(
        'border-zinc-800/80 bg-zinc-950 shadow-none',
        href && 'transition-colors hover:border-zinc-600 hover:bg-zinc-900/40',
      )}
    >
      <CardContent className="p-5">
        {headerRow}
        {href ? (
          <Link
            href={href}
            className="block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 -m-1 p-1"
            aria-label={`${label} : ${value}. Ouvrir la page détaillée.`}
          >
            {valueBlock}
          </Link>
        ) : (
          valueBlock
        )}
      </CardContent>
    </Card>
  )

  return card
}
