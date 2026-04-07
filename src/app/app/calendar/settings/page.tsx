import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createClient } from '@/lib/supabase/server'
import { hasGoogleCalendarToken } from '@/modules/google-calendar/token'
import { getAllCalendarSelections } from '@/modules/google-calendar/queries'
import { disconnectGoogleCalendar } from '@/modules/google-calendar/actions'
import { CalendarSettingsForm } from '@/modules/google-calendar/components/CalendarSettingsForm'
import { SyncCalendarsButton } from '@/modules/google-calendar/components/SyncCalendarsButton'
import { Button } from '@/components/ui/button'

export default async function CalendarSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const sp = await searchParams
  const err = sp.error

  const supabase = await createClient()
  const connected = await hasGoogleCalendarToken(supabase, scope.userId)
  const selections = connected ? await getAllCalendarSelections(supabase, scope.userId) : []

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-100">Agendas Google</h1>
        <p className="text-sm text-zinc-500">
          Connecte ton compte Google pour afficher et créer des événements depuis l&apos;ERP.
        </p>
        {err ? (
          <p className="text-sm text-red-400">
            Connexion interrompue ({err}). Réessaie ou vérifie la console Google Cloud (redirect URI).
          </p>
        ) : null}
      </div>

      {!connected ? (
        <div className="space-y-4">
          <Button asChild variant="default" size="lg">
            <Link href="/api/auth/google">Connecter Google Calendar</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <SyncCalendarsButton />
            <form action={disconnectGoogleCalendar}>
              <Button type="submit" variant="destructive" size="sm">
                Déconnecter
              </Button>
            </form>
          </div>
          <CalendarSettingsForm items={selections} />
          <p className="text-xs text-zinc-600">
            <Link href="/app/calendar" className="text-zinc-400 underline hover:text-white">
              Retour à l&apos;agenda
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
