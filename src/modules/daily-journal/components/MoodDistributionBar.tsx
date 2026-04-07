'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MOOD_EMOJIS, MOOD_LABELS, type MoodLevel } from '../types'

const MOODS: MoodLevel[] = [1, 2, 3, 4, 5]

const BAR_COLORS: Record<MoodLevel, string> = {
  1: '#dc2626',
  2: '#ea580c',
  3: '#ca8a04',
  4: '#86efac',
  5: '#22c55e',
}

export function MoodDistributionBar({
  moodDistribution,
  totalEntries,
}: {
  moodDistribution: Record<MoodLevel, number>
  totalEntries: number
}) {
  if (totalEntries === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-zinc-200">Répartition de l&apos;humeur</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[100px] items-center justify-center text-sm text-zinc-500">
          Aucune entrée sur la période
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-zinc-200">Répartition de l&apos;humeur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {MOODS.map((m) => {
            const count = moodDistribution[m] ?? 0
            const pct = (count / totalEntries) * 100
            if (pct <= 0) return null
            return (
              <div
                key={m}
                className="h-full min-w-0 transition-all"
                style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[m] }}
                title={`${MOOD_LABELS[m]} : ${count}`}
              />
            )
          })}
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {MOODS.map((m) => {
            const count = moodDistribution[m] ?? 0
            return (
              <li key={m} className="flex items-center gap-2 text-xs text-zinc-400">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: BAR_COLORS[m] }}
                />
                <span className="text-zinc-300">
                  {MOOD_EMOJIS[m]} {MOOD_LABELS[m]}
                </span>
                <span className="ml-auto font-mono text-zinc-500">{count}</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
