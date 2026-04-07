import type { DailyJournalEntry } from '../types'
import { formatMonthSectionLabel, monthKeyFromJournalDate } from '../utils'
import { JournalEntryCard } from './JournalEntryCard'
import { JournalMonthOverview } from './JournalMonthOverview'
import { JournalTodayPrompt } from './JournalTodayPrompt'

function groupByMonth(entries: DailyJournalEntry[]): Map<string, DailyJournalEntry[]> {
  const map = new Map<string, DailyJournalEntry[]>()
  for (const e of entries) {
    const key = monthKeyFromJournalDate(e.journal_date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

export function JournalTimeline({
  entries,
  todayIso,
  hasEntryToday,
}: {
  entries: DailyJournalEntry[]
  todayIso: string
  hasEntryToday: boolean
}) {
  if (entries.length === 0 && !hasEntryToday) {
    return (
      <div className="relative">
        <div className="absolute bottom-0 left-[11px] top-0 w-px bg-zinc-800/90 sm:left-[15px]" aria-hidden />
        <JournalTodayPrompt date={todayIso} />
        <p className="mt-10 pl-6 text-center text-sm text-zinc-500 sm:pl-8">
          Aucune entrée passée. Ton journal commence ici.
        </p>
      </div>
    )
  }

  const byMonth = groupByMonth(entries)
  const monthKeys = [...byMonth.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="relative">
      <div
        className="absolute bottom-0 left-[11px] top-0 w-px bg-gradient-to-b from-zinc-700/60 via-zinc-800 to-zinc-800/40 sm:left-[15px]"
        aria-hidden
      />

      <div className="space-y-10">
        {!hasEntryToday ? <JournalTodayPrompt date={todayIso} /> : null}

        {monthKeys.map((monthKey) => {
          const list = [...(byMonth.get(monthKey) ?? [])].sort((a, b) =>
            b.journal_date.localeCompare(a.journal_date)
          )
          return (
            <section key={monthKey} className="space-y-4 pl-6 sm:pl-8">
              <h2 className="sticky top-0 z-10 -ml-1 inline-block bg-zinc-950/95 px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 backdrop-blur-sm">
                {formatMonthSectionLabel(monthKey)}
              </h2>
              <JournalMonthOverview monthKey={monthKey} entries={list} />
              <ul className="space-y-5">
                {list.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span
                      className="absolute -left-[21px] top-8 h-2 w-2 rounded-full bg-zinc-500 sm:-left-[25px]"
                      aria-hidden
                    />
                    <JournalEntryCard entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
