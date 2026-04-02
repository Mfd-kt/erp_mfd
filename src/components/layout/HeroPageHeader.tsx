'use client'

import { ExplainCalculationTrigger } from '@/components/ui/explain-calculation-trigger'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'

interface HeroPageHeaderProps {
  title: string
  subtitle?: string
  rightSlot?: React.ReactNode
  /** Aide contextuelle sur la page (périmètre, définitions). */
  explain?: GroupExplainPayload
}

export function HeroPageHeader({ title, subtitle, rightSlot, explain }: HeroPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h1 className="page-hero-title flex-1">{title}</h1>
            {explain ? (
              <ExplainCalculationTrigger
                payload={explain}
                ariaLabel={`Aide : ${title}`}
                size="md"
                className="mt-1 shrink-0"
              />
            ) : null}
          </div>
          {subtitle ? <p className="page-hero-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {rightSlot ? <div className="flex-shrink-0">{rightSlot}</div> : null}
    </div>
  )
}
