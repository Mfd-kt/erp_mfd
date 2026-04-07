'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExplainCalculationTrigger } from '@/components/ui/explain-calculation-trigger'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'

interface SectionBlockProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: string
  /** Actions alignées à droite du titre (boutons, liens). */
  headerRight?: React.ReactNode
  /** Popup d’explication sur la section (méthode de calcul, périmètre). */
  explain?: GroupExplainPayload
  children: React.ReactNode
}

export function SectionBlock({ title, subtitle, icon, badge, headerRight, explain, children }: SectionBlockProps) {
  return (
    <Card className="border-zinc-800/80 bg-zinc-950 shadow-none">
      <CardHeader className="border-b border-zinc-800/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {icon ? <span className="text-zinc-500">{icon}</span> : null}
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">
                {title}
              </CardTitle>
              {badge ? (
                <span className="rounded border border-zinc-700 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                  {badge}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="text-xs text-zinc-500 mt-1 max-w-2xl">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight ? <div className="flex flex-wrap items-center justify-end gap-2">{headerRight}</div> : null}
            {explain ? (
              <ExplainCalculationTrigger
                payload={explain}
                ariaLabel={`Explication : ${title}`}
                className="mt-0.5"
              />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  )
}
