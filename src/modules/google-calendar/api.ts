import type { GoogleCalendarEvent } from './types'

export interface GoogleCalendarListItem {
  id: string
  summary: string
  backgroundColor: string | null
}

interface GApiEventRaw {
  id: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}

function mapGoogleEvent(
  raw: GApiEventRaw,
  meta: { calendar_id: string; calendar_name: string; calendar_color: string | null }
): GoogleCalendarEvent {
  const start = raw.start
  const end = raw.end
  let isAllDay = false
  let startIso = ''
  let endIso = ''

  if (start?.date) {
    isAllDay = true
    const sd = start.date
    const ed = end?.date ?? sd
    startIso = `${sd}T00:00:00.000Z`
    endIso = `${ed}T00:00:00.000Z`
  } else {
    startIso = start?.dateTime ?? ''
    endIso = end?.dateTime ?? startIso
  }

  return {
    id: raw.id,
    calendar_id: meta.calendar_id,
    calendar_name: meta.calendar_name,
    calendar_color: meta.calendar_color,
    title: raw.summary ?? '(Sans titre)',
    description: raw.description ?? null,
    location: raw.location ?? null,
    start: startIso,
    end: endIso,
    is_all_day: isAllDay,
    html_link: raw.htmlLink ?? null,
  }
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendarListItem[]> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`calendarList: ${res.status} ${t.slice(0, 200)}`)
  }
  const json = (await res.json()) as { items?: Array<{ id: string; summary?: string; backgroundColor?: string }> }
  const items = json.items ?? []
  return items.map((i) => ({
    id: i.id,
    summary: i.summary ?? i.id,
    backgroundColor: i.backgroundColor ?? null,
  }))
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  meta: { calendar_name: string; calendar_color: string | null }
): Promise<GoogleCalendarEvent[]> {
  const cal = encodeURIComponent(calendarId)
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const url = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events?${params.toString()}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`events.list: ${res.status} ${t.slice(0, 200)}`)
  }
  const json = (await res.json()) as { items?: GApiEventRaw[] }
  const items = json.items ?? []
  return items.map((raw) =>
    mapGoogleEvent(raw, {
      calendar_id: calendarId,
      calendar_name: meta.calendar_name,
      calendar_color: meta.calendar_color,
    })
  )
}

export interface CreateEventPayload {
  summary: string
  description?: string | null
  location?: string | null
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: CreateEventPayload,
  meta: { calendar_name: string; calendar_color: string | null }
): Promise<GoogleCalendarEvent> {
  const cal = encodeURIComponent(calendarId)
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`events.insert: ${res.status} ${t.slice(0, 200)}`)
  }
  const raw = (await res.json()) as GApiEventRaw
  return mapGoogleEvent(raw, {
    calendar_id: calendarId,
    calendar_name: meta.calendar_name,
    calendar_color: meta.calendar_color,
  })
}
