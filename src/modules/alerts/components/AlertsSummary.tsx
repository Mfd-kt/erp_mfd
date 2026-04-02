'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ExplainCalculationTrigger } from '@/components/ui/explain-calculation-trigger'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'

interface Props {
  critical: number
  warnings: number
  infos: number
  explains?: {
    critical: GroupExplainPayload
    warnings: GroupExplainPayload
    infos: GroupExplainPayload
  }
}

export function AlertsSummary({ critical, warnings, infos, explains }: Props) {
  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardContent className="p-4 flex flex-wrap items-center gap-6 text-xs text-zinc-300">
        <span className="inline-flex items-center gap-1.5">
          {explains?.critical ? (
            <ExplainCalculationTrigger payload={explains.critical} ariaLabel="Détail : alertes critiques" />
          ) : null}
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          {critical} critiques
        </span>
        <span className="inline-flex items-center gap-1.5">
          {explains?.warnings ? (
            <ExplainCalculationTrigger payload={explains.warnings} ariaLabel="Détail : avertissements" />
          ) : null}
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          {warnings} avertissements
        </span>
        <span className="inline-flex items-center gap-1.5">
          {explains?.infos ? (
            <ExplainCalculationTrigger payload={explains.infos} ariaLabel="Détail : informations" />
          ) : null}
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          {infos} infos
        </span>
      </CardContent>
    </Card>
  )
}
