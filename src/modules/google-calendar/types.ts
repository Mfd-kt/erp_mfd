export interface GoogleCalendarToken {
  user_id: string
  access_token: string
  refresh_token: string
  token_expiry: string
  scope: string | null
}

export interface GoogleCalendarSelection {
  id: string
  user_id: string
  calendar_id: string
  calendar_name: string
  color: string | null
  is_selected: boolean
}

export interface GoogleCalendarEvent {
  id: string
  calendar_id: string
  calendar_name: string
  calendar_color: string | null
  title: string
  description: string | null
  location: string | null
  start: string
  end: string
  is_all_day: boolean
  html_link: string | null
}

export interface CalendarDay {
  date: string
  events: GoogleCalendarEvent[]
}
