import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createClient } from '@/lib/supabase/server'
import { getJournalStats } from '@/modules/daily-journal/queries'
import { MOOD_EMOJIS, MOOD_LABELS, type MoodLevel } from '@/modules/daily-journal/types'
import { MoodChart } from '@/modules/daily-journal/components/MoodChart'
import { MoodDistributionBar } from '@/modules/daily-journal/components/MoodDistributionBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function dominantEnergyLabel(ae: { low: number; medium: number; high: number }): string {
  const order: { key: keyof typeof ae; label: string }[] = [
    { key: 'high', label: 'Haute' },
    { key: 'medium', label: 'Moyenne' },
    { key: 'low', label: 'Basse' },
  ]
  let best = order[0]
  let bestV = ae[best.key]
  for (const o of order) {
    if (ae[o.key] > bestV) {
      best = o
      bestV = ae[o.key]
    }
  }
  return best.label
}

export default async function JournalStatsPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const supabase = await createClient()
  const stats = await getJournalStats(supabase, scope.userId)

  const moodEmoji =
    stats.averageMood != null
      ? MOOD_EMOJIS[Math.min(5, Math.max(1, Math.round(stats.averageMood))) as MoodLevel]
      : '—'

  const energyLabel =
    stats.totalEntries > 0 ? dominantEnergyLabel(stats.averageEnergy) : '—'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-zinc-400 hover:text-white">
            <Link href="/app/journal" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au journal
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Tendances — 30 derniers jours
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Humeur moyenne
            </p>
            <p className="mt-2 flex items-baseline gap-2 text-2xl font-semibold text-zinc-100">
              {stats.averageMood != null ? (
                <>
                  <span>{stats.averageMood.toFixed(1)}</span>
                  <span className="text-2xl" aria-hidden>
                    {moodEmoji}
                  </span>
                </>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Énergie dominante
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-100">{energyLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Série en cours
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-100">
              {stats.streakDays} jour{stats.streakDays !== 1 ? 's' : ''} de suite
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Entrées complétées
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-100">
              {stats.totalEntries} / 30
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <MoodChart entries={stats.entries} />
        <MoodDistributionBar
          moodDistribution={stats.moodDistribution}
          totalEntries={stats.totalEntries}
        />
      </div>
    </div>
  )
}
