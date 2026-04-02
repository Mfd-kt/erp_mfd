import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateNotificationPreferences } from '@/modules/notifications/preferences/queries'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { SectionBlock } from '@/components/ui/section-block'
import { NotificationPreferencesForm } from '@/modules/notifications/preferences/components/NotificationPreferencesForm'

export default async function NotificationPreferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const prefs = await getOrCreateNotificationPreferences(user.id)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Préférences de notification"
        subtitle="Heures d'envoi, canaux et types de rappels"
      />

      <SectionBlock title="Configuration" subtitle="Personnalisez quand et comment vous recevez les rappels.">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <NotificationPreferencesForm initial={prefs} />
          </CardContent>
        </Card>
      </SectionBlock>
    </div>
  )
}
