'use client'

import Link from 'next/link'
import type { CalendarDay } from '../types'
import { EventChip } from './EventChip'
import { cn } from '@/lib/utils'

function dayHeaderLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const wd = dt.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' })
  const rest = dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)} ${rest}`
}

export function CalendarDayColumn({ day, isToday }: { day: CalendarDay; isToday: boolean }) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col rounded-xl border bg-zinc-900/30 p-2',
        isToday ? 'border-zinc-500/80 ring-1 ring-zinc-600/50' : 'border-zinc-800'
      )}
    >
      <Link
        href={`/app/journal/${day.date}`}
        className={cn(
          'mb-2 block rounded-lg px-1 py-1 text-center text-xs font-medium transition-colors hover:bg-zinc-800/80',
          isToday ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
        )}
      >
        {dayHeaderLabel(day.date)}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {day.events.length === 0 ? (
          <p className="px-1 py-2 text-center text-[11px] text-zinc-600">—</p>
        ) : (
          day.events.map((ev) => <EventChip key={`${ev.calendar_id}-${ev.id}`} event={ev} />)
        )}
      </div>
    </div>
  )
}
