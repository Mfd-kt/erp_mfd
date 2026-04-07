import { notFound, redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createClient } from '@/lib/supabase/server'
import { getJournalEntry } from '@/modules/daily-journal/queries'
import { JournalEntryForm } from '@/modules/daily-journal/components/JournalEntryForm'
import { DailyPlanSummary } from '@/modules/daily-journal/components/DailyPlanSummary'
import { formatJournalDate, todayIsoDateUTC } from '@/modules/daily-journal/utils'
import { JournalDatePageChrome } from '@/modules/daily-journal/components/JournalDatePageChrome'
import { JournalAiPanel } from '@/modules/daily-journal/components/JournalAiPanel'
import { hasGoogleCalendarToken } from '@/modules/google-calendar/token'
import { getEventsForDate } from '@/modules/google-calendar/service'
import { DayEventsBlock } from '@/modules/google-calendar/components/DayEventsBlock'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseValidDate(date: string): Date | null {
  if (!DATE_RE.test(date)) return null
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null
  }
  return dt
}

export default async function JournalDatePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (!parseValidDate(date)) notFound()

  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const supabase = await createClient()
  const connected = await hasGoogleCalendarToken(supabase, scope.userId)
  const [entry, dayEvents] = await Promise.all([
    getJournalEntry(supabase, scope.userId, date),
    connected ? getEventsForDate(supabase, scope.userId, date) : Promise.resolve([]),
  ])

  const title = formatJournalDate(date)
  const todayIso = todayIsoDateUTC()
  const isToday = date === todayIso

  return (
    <div className="space-y-10 pb-10">
      <JournalDatePageChrome date={date} formattedTitle={title} isToday={isToday} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:items-start">
        <aside className="min-w-0 space-y-4">
          {connected ? <DayEventsBlock events={dayEvents} journalDate={date} /> : null}
          <DailyPlanSummary userId={scope.userId} journalDate={date} />
        </aside>
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/40 to-zinc-950/90 p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] sm:p-8">
          <div
            className="pointer-events-none absolute -right-24 top-0 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl"
            aria-hidden
          />
          <JournalEntryForm key={date} journalDate={date} initialEntry={entry} isToday={isToday} />
        </div>
      </div>

      <JournalAiPanel journalDate={date} />
    </div>
  )
}
