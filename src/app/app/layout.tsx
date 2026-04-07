import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import AppShellClient from '@/components/layout/AppShellClient'
import { hasGoogleCalendarToken } from '@/modules/google-calendar/token'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const supabase = await createClient()
  const [{ data: profile }, calendarConnected] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, email')
      .eq('user_id', scope.userId)
      .single(),
    hasGoogleCalendarToken(supabase, scope.userId),
  ])

  return (
    <AppShellClient
      user={scope.user}
      profile={profile}
      companies={scope.companies}
      group={scope.group}
      role={scope.role}
      isGroupAdmin={scope.isGroupAdmin}
      calendarConnected={calendarConnected}
    >
      {children}
    </AppShellClient>
  )
}
