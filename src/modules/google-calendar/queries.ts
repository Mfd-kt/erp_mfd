import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleCalendarSelection } from './types'

function mapSelection(row: Record<string, unknown>): GoogleCalendarSelection {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    calendar_id: row.calendar_id as string,
    calendar_name: row.calendar_name as string,
    color: (row.color as string | null) ?? null,
    is_selected: row.is_selected as boolean,
  }
}

export async function getSelectedCalendars(
  supabase: SupabaseClient,
  userId: string
): Promise<GoogleCalendarSelection[]> {
  const { data, error } = await supabase
    .from('google_calendar_selections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_selected', true)
    .order('calendar_name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapSelection(r as Record<string, unknown>))
}

export async function getAllCalendarSelections(
  supabase: SupabaseClient,
  userId: string
): Promise<GoogleCalendarSelection[]> {
  const { data, error } = await supabase
    .from('google_calendar_selections')
    .select('*')
    .eq('user_id', userId)
    .order('calendar_name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapSelection(r as Record<string, unknown>))
}

export async function upsertCalendarSelections(
  supabase: SupabaseClient,
  userId: string,
  calendars: Array<{
    calendar_id: string
    calendar_name: string
    color: string | null
    is_selected: boolean
  }>
): Promise<void> {
  for (const c of calendars) {
    const { error } = await supabase.from('google_calendar_selections').upsert(
      {
        user_id: userId,
        calendar_id: c.calendar_id,
        calendar_name: c.calendar_name,
        color: c.color,
        is_selected: c.is_selected,
      },
      { onConflict: 'user_id,calendar_id' }
    )
    if (error) throw new Error(error.message)
  }
}

export async function updateCalendarSelectionRow(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  isSelected: boolean
): Promise<void> {
  const { error } = await supabase
    .from('google_calendar_selections')
    .update({ is_selected: isSelected })
    .eq('user_id', userId)
    .eq('calendar_id', calendarId)

  if (error) throw new Error(error.message)
}

export async function deleteCalendarSelectionsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('google_calendar_selections').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}
