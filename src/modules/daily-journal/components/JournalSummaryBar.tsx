import type { MoodLevel } from '../types'
import { MoodTrendDots } from './MoodTrendDots'

export function JournalSummaryBar({
  averageMood,
  streakDays,
  countThisMonth,
  weekMoods,
}: {
  averageMood: number | null
  streakDays: number
  countThisMonth: number
  weekMoods: (MoodLevel | null)[]
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:flex lg:flex-1 lg:gap-10">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Humeur moy.
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
              {averageMood != null ? averageMood.toFixed(1) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Jours de suite
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
              {streakDays}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Ce mois-ci
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
              {countThisMonth}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 border-t border-zinc-800/80 pt-3 lg:border-t-0 lg:pt-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
            7 jours
          </p>
          <MoodTrendDots moods={weekMoods} />
        </div>
      </div>
    </div>
  )
}
