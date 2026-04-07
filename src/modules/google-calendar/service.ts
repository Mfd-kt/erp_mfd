import type { SupabaseClient } from '@supabase/supabase-js'
import { createEvent, listCalendars, listEvents } from './api'
import type { CalendarDay, GoogleCalendarEvent } from './types'
import { getAllCalendarSelections, getSelectedCalendars, upsertCalendarSelections } from './queries'
import { getValidAccessToken } from './token'

export function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return dt.toISOString().slice(0, 10)
}

/** Lundi (UTC) de la semaine qui contient `isoDate` (YYYY-MM-DD). */
export function mondayOfWeekContaining(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay()
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  dt.setUTCDate(dt.getUTCDate() - daysFromMonday)
  return dt.toISOString().slice(0, 10)
}

function eventDayKeyUTC(ev: GoogleCalendarEvent): string {
  if (ev.is_all_day) {
    return ev.start.slice(0, 10)
  }
  return new Date(ev.start).toISOString().slice(0, 10)
}

function compareEvents(a: GoogleCalendarEvent, b: GoogleCalendarEvent): number {
  return a.start.localeCompare(b.start)
}

export async function syncCalendarsFromGoogle(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const access = await getValidAccessToken(supabase, userId)
  if (!access) return

  const remote = await listCalendars(access)
  const existing = await getAllCalendarSelections(supabase, userId)
  const byId = new Map(existing.map((e) => [e.calendar_id, e]))

  const calendars = remote.map((r) => ({
    calendar_id: r.id,
    calendar_name: r.summary,
    color: r.backgroundColor,
    is_selected: byId.get(r.id)?.is_selected ?? true,
  }))

  await upsertCalendarSelections(supabase, userId, calendars)
}

export async function getEventsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<GoogleCalendarEvent[]> {
  const access = await getValidAccessToken(supabase, userId)
  if (!access) return []

  const selected = await getSelectedCalendars(supabase, userId)
  if (selected.length === 0) return []

  const timeMin = `${date}T00:00:00.000Z`
  const timeMax = `${date}T23:59:59.999Z`

  const merged: GoogleCalendarEvent[] = []
  for (const cal of selected) {
    try {
      const evs = await listEvents(access, cal.calendar_id, timeMin, timeMax, {
        calendar_name: cal.calendar_name,
        calendar_color: cal.color,
      })
      merged.push(...evs)
    } catch {
      // ignore calendar errors — pas d’erreur visible côté journal
    }
  }

  return merged
    .filter((e) => eventDayKeyUTC(e) === date)
    .sort(compareEvents)
}

export async function getEventsForWeek(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string
): Promise<CalendarDay[]> {
  const access = await getValidAccessToken(supabase, userId)
  if (!access) return []

  const selected = await getSelectedCalendars(supabase, userId)
  if (selected.length === 0) return []

  const weekEnd = addDaysIso(weekStart, 6)
  const timeMin = `${weekStart}T00:00:00.000Z`
  const timeMax = `${weekEnd}T23:59:59.999Z`

  const days: CalendarDay[] = []
  for (let i = 0; i < 7; i++) {
    days.push({ date: addDaysIso(weekStart, i), events: [] })
  }
  const byDate = new Map(days.map((d) => [d.date, d.events]))

  for (const cal of selected) {
    try {
      const evs = await listEvents(access, cal.calendar_id, timeMin, timeMax, {
        calendar_name: cal.calendar_name,
        calendar_color: cal.color,
      })
      for (const ev of evs) {
        const key = eventDayKeyUTC(ev)
        const bucket = byDate.get(key)
        if (bucket) bucket.push(ev)
      }
    } catch {
      // ignore
    }
  }

  for (const d of days) {
    d.events.sort(compareEvents)
  }

  return days
}
