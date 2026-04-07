import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createClient } from '@/lib/supabase/server'
import {
  getJournalEntries,
  getJournalEntriesCountThisMonth,
  getJournalStats,
} from '@/modules/daily-journal/queries'
import { JournalSummaryBar } from '@/modules/daily-journal/components/JournalSummaryBar'
import { JournalTimeline } from '@/modules/daily-journal/components/JournalTimeline'
import { JournalAiPanel } from '@/modules/daily-journal/components/JournalAiPanel'
import { Button } from '@/components/ui/button'
import {
  averageMoodForMonthPrefix,
  currentMonthPrefixUTC,
  formatCurrentMonthYearCapitalized,
  lastSevenDaysMoods,
  todayIsoDateUTC,
} from '@/modules/daily-journal/utils'

export default async function JournalPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const supabase = await createClient()
  const todayIso = todayIsoDateUTC()

  const [entries, stats, countThisMonth] = await Promise.all([
    getJournalEntries(supabase, scope.userId, 90),
    getJournalStats(supabase, scope.userId),
    getJournalEntriesCountThisMonth(supabase, scope.userId),
  ])

  const monthPrefix = currentMonthPrefixUTC()
  const avgMonth = averageMoodForMonthPrefix(stats.entries, monthPrefix)
  const weekMoods = lastSevenDaysMoods(stats.entries, todayIso)
  const hasEntryToday = entries.some((e) => e.journal_date === todayIso)

  const groupLabel = scope.group?.name ?? 'Vue groupe'
  const monthSubtitle = formatCurrentMonthYearCapitalized()

  return (
    <div className="space-y-10 pb-8">
      <header className="flex flex-col gap-6 border-b border-zinc-800/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="playfair-serif text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Journal
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
            {groupLabel} · {monthSubtitle} — une ligne par jour : humeur, énergie, ce qui avance, ce qui bloque, et
            l&apos;intention pour demain.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="lg">
            <Link href="/app/journal/stats">Statistiques</Link>
          </Button>
          <Button asChild variant="default" size="lg" className="gap-2">
            <Link href="/app/journal/today">
              <span aria-hidden className="text-lg leading-none">
                +
              </span>
              Écrire le journal d&apos;aujourd&apos;hui
            </Link>
          </Button>
        </div>
      </header>

      <JournalSummaryBar
        averageMood={avgMonth}
        streakDays={stats.streakDays}
        countThisMonth={countThisMonth}
        weekMoods={weekMoods}
      />

      <JournalAiPanel />

      <JournalTimeline entries={entries} todayIso={todayIso} hasEntryToday={hasEntryToday} />
    </div>
  )
}
