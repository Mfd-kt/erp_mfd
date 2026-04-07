import Link from 'next/link'
import { Calendar } from 'lucide-react'
import type { GoogleCalendarEvent } from '../types'
import { mondayOfWeekContaining } from '../service'

function formatTime(ev: GoogleCalendarEvent): string {
  if (ev.is_all_day) return 'Journée entière'
  const s = new Date(ev.start)
  return s.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export function DayEventsBlock({
  events,
  journalDate,
}: {
  events: GoogleCalendarEvent[]
  journalDate: string
}) {
  const weekStart = mondayOfWeekContaining(journalDate)
  const href = `/app/calendar?week=${encodeURIComponent(weekStart)}`

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-200">Événements du jour</h2>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun événement ce jour</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={`${ev.calendar_id}-${ev.id}`} className="flex items-start gap-2 text-sm">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: ev.calendar_color ?? '#52525b' }}
              />
              <div className="min-w-0 flex-1">
                <span className="text-zinc-500">{formatTime(ev)}</span>{' '}
                <span className="text-zinc-200">{ev.title}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={href}
        className="mt-3 inline-block text-xs font-medium text-zinc-400 underline-offset-4 hover:text-white hover:underline"
      >
        Voir l&apos;agenda
      </Link>
    </div>
  )
}
