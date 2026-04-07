'use client'

import type { GoogleCalendarEvent } from '../types'

function formatTimeRange(ev: GoogleCalendarEvent): string {
  if (ev.is_all_day) return 'Journée entière'
  const s = new Date(ev.start)
  const e = new Date(ev.end)
  const tf: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }
  return `${s.toLocaleTimeString('fr-FR', tf)} – ${e.toLocaleTimeString('fr-FR', tf)}`
}

export function EventChip({ event }: { event: GoogleCalendarEvent }) {
  const color = event.calendar_color ?? '#71717a'
  const tip = [event.description, event.location].filter(Boolean).join('\n\n')

  return (
    <div
      className="flex min-w-0 gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-2 py-1.5 text-left text-xs"
      title={tip || undefined}
    >
      <span
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-100">{event.title}</p>
        <p className="text-[11px] text-zinc-500">{formatTimeRange(event)}</p>
      </div>
    </div>
  )
}
