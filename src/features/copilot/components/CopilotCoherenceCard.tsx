'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { RecommendationStatusStats } from '../types'

interface CopilotCoherenceCardProps {
  stats: RecommendationStatusStats
}

export function CopilotCoherenceCard({ stats }: CopilotCoherenceCardProps) {
  const decided = stats.accepted + stats.dismissed + stats.done
  const ratio =
    decided > 0 ? Math.round(((stats.accepted + stats.done) / decided) * 100) : null

  return (
    <Card className="border-zinc-800 bg-zinc-950/50">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Indicateur de cohérence (recommandations)</p>
        <p className="mt-2 text-sm text-zinc-300">
          Sur les recommandations tranchées (hors « ouvert »), environ{' '}
          <span className="font-semibold text-amber-200/95">{ratio ?? '—'}%</span> suivies ou marquées faites
          {ratio != null ? ' — ' : ' '}
          (accepté + fait / (accepté + ignoré + fait)).
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded border border-zinc-800 px-2 py-1 text-zinc-400">
            Ouvertes <span className="text-zinc-200">{stats.open}</span>
          </div>
          <div className="rounded border border-zinc-800 px-2 py-1 text-zinc-400">
            Suivies <span className="text-zinc-200">{stats.accepted}</span>
          </div>
          <div className="rounded border border-zinc-800 px-2 py-1 text-zinc-400">
            Ignorées <span className="text-zinc-200">{stats.dismissed}</span>
          </div>
          <div className="rounded border border-zinc-800 px-2 py-1 text-zinc-400">
            Fait <span className="text-zinc-200">{stats.done}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
