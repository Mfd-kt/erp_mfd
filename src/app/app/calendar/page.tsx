import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/modules/google-calendar/token'
import { getSelectedCalendars } from '@/modules/google-calendar/queries'
import { getEventsForWeek, mondayOfWeekContaining } from '@/modules/google-calendar/service'
import { CalendarWeekToolbar } from '@/modules/google-calendar/components/CalendarWeekToolbar'
import { todayIsoDateUTC } from '@/modules/daily-journal/utils'

function parseWeekSearchParam(week: string | undefined): string {
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return mondayOfWeekContaining(todayIsoDateUTC())
  }
  return mondayOfWeekContaining(week)
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const sp = await searchParams
  const weekStart = parseWeekSearchParam(sp.week)

  const supabase = await createClient()
  const access = await getValidAccessToken(supabase, scope.userId)
  if (!access) {
    redirect('/app/calendar/settings')
  }

  const [days, calendars] = await Promise.all([
    getEventsForWeek(supabase, scope.userId, weekStart),
    getSelectedCalendars(supabase, scope.userId),
  ])

  return (
    <CalendarWeekToolbar weekStart={weekStart} days={days} calendars={calendars} />
  )
}
