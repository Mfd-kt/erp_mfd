'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createEvent as createGoogleEvent } from './api'
import { createEventSchema } from './schema'
import {
  deleteCalendarSelectionsForUser,
  getSelectedCalendars,
  updateCalendarSelectionRow,
} from './queries'
import { addDaysIso, syncCalendarsFromGoogle } from './service'
import { deleteTokenForUser, getValidAccessToken } from './token'

export async function syncCalendarListAction(): Promise<{ error?: string }> {
  const scope = await getAccessScope()
  if (!scope) return { error: 'Non authentifié' }
  const supabase = await createClient()
  try {
    await syncCalendarsFromGoogle(supabase, scope.userId)
    revalidatePath('/app/calendar/settings')
    revalidatePath('/app/calendar')
    return {}
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur synchronisation'
    return { error: msg }
  }
}

export async function updateCalendarSelection(
  calendarId: string,
  isSelected: boolean
): Promise<{ error?: string }> {
  const scope = await getAccessScope()
  if (!scope) return { error: 'Non authentifié' }
  const supabase = await createClient()
  try {
    await updateCalendarSelectionRow(supabase, scope.userId, calendarId, isSelected)
    revalidatePath('/app/calendar/settings')
    revalidatePath('/app/calendar')
    return {}
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur'
    return { error: msg }
  }
}

export async function createCalendarEvent(
  formData: FormData
): Promise<{ success?: true; error?: string }> {
  const scope = await getAccessScope()
  if (!scope) return { error: 'Non authentifié' }

  const raw = {
    calendar_id: formData.get('calendar_id')?.toString() ?? '',
    title: formData.get('title')?.toString() ?? '',
    date_start: formData.get('date_start')?.toString() ?? '',
    date_end: formData.get('date_end')?.toString() ?? '',
    time_start: formData.get('time_start')?.toString() || undefined,
    time_end: formData.get('time_end')?.toString() || undefined,
    description: formData.get('description')?.toString() || null,
    location: formData.get('location')?.toString() || null,
    is_all_day: formData.get('is_all_day') === 'true' || formData.get('is_all_day') === 'on',
  }

  const parsed = createEventSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { error: first }
  }

  const v = parsed.data
  const supabase = await createClient()
  const access = await getValidAccessToken(supabase, scope.userId)
  if (!access) return { error: 'Google Calendar non connecté ou session expirée.' }

  const selected = await getSelectedCalendars(supabase, scope.userId)
  const cal = selected.find((c) => c.calendar_id === v.calendar_id)
  if (!cal) return { error: 'Calendrier introuvable ou non sélectionné.' }

  try {
    if (v.is_all_day) {
      await createGoogleEvent(
        access,
        v.calendar_id,
        {
          summary: v.title,
          description: v.description ?? undefined,
          location: v.location ?? undefined,
          start: { date: v.date_start },
          end: { date: addDaysIso(v.date_end, 1) },
        },
        { calendar_name: cal.calendar_name, calendar_color: cal.color }
      )
    } else {
      await createGoogleEvent(
        access,
        v.calendar_id,
        {
          summary: v.title,
          description: v.description ?? undefined,
          location: v.location ?? undefined,
          start: { dateTime: `${v.date_start}T${v.time_start}:00.000Z` },
          end: { dateTime: `${v.date_end}T${v.time_end}:00.000Z` },
        },
        { calendar_name: cal.calendar_name, calendar_color: cal.color }
      )
    }
    revalidatePath('/app/calendar')
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Création impossible'
    return { error: msg }
  }
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  const supabase = await createClient()
  await deleteCalendarSelectionsForUser(supabase, scope.userId)
  await deleteTokenForUser(supabase, scope.userId)
  revalidatePath('/app/calendar/settings')
  revalidatePath('/app/calendar')
  redirect('/app/calendar/settings')
}
