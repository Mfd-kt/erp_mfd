'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDay, GoogleCalendarSelection } from '../types'
import { CreateEventDrawer } from './CreateEventDrawer'
import { CalendarDayColumn } from './CalendarDayColumn'
import { Button } from '@/components/ui/button'
import { todayIsoDateUTC } from '@/modules/daily-journal/utils'
import { addDaysIso } from '../service'

function weekRangeLabel(weekStart: string): string {
  const end = addDaysIso(weekStart, 6)
  const [y1, m1, d1] = weekStart.split('-').map(Number)
  const [y2, m2, d2] = end.split('-').map(Number)
  const a = new Date(Date.UTC(y1, m1 - 1, d1))
  const b = new Date(Date.UTC(y2, m2 - 1, d2))
  const fa = a.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  const fb = b.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return `${fa} au ${fb}`
}

export function CalendarWeekToolbar({
  weekStart,
  days,
  calendars,
}: {
  weekStart: string
  days: CalendarDay[]
  calendars: GoogleCalendarSelection[]
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const today = todayIsoDateUTC()
  const prev = addDaysIso(weekStart, -7)
  const next = addDaysIso(weekStart, 7)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/calendar?week=${prev}`}>
              <ChevronLeft className="h-4 w-4" />
              Semaine précédente
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/calendar?week=${next}`}>
              Semaine suivante
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <h1 className="text-center text-lg font-semibold text-zinc-100 lg:flex-1">
          Semaine du {weekRangeLabel(weekStart)}
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/calendar/settings">Gérer les agendas</Link>
          </Button>
          <Button variant="default" size="sm" type="button" onClick={() => setDrawerOpen(true)}>
            Nouvel événement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => (
          <CalendarDayColumn key={day.date} day={day} isToday={day.date === today} />
        ))}
      </div>

      <CreateEventDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        calendars={calendars}
        defaultDate={today}
      />
    </div>
  )
}
