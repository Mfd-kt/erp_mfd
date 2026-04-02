import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { SectionBlock } from '@/components/ui/section-block'
import { ChannelConfigForm } from '@/modules/notifications/channels/components/ChannelConfigForm'

export default async function NotificationChannelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: channels } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('user_id', user.id)

  const slackChannel = channels?.find((c) => c.channel_type === 'slack')
  const whatsappChannel = channels?.find((c) => c.channel_type === 'whatsapp')

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Canaux de notification"
        subtitle="Slack et WhatsApp pour les rappels et plans"
      />

      <SectionBlock title="Configuration" subtitle="Connectez vos canaux pour recevoir les rappels.">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-6">
              <h3 className="font-medium text-zinc-100">Slack</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Plan du matin, rappels de tâches en retard, résumé de fin de journée.
              </p>
              <ChannelConfigForm
                channelType="slack"
                existing={slackChannel}
                configKeys={['webhook_url']}
              />
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-6">
              <h3 className="font-medium text-zinc-100">WhatsApp</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Rappels critiques et plan du jour (intégration à venir).
              </p>
              <ChannelConfigForm
                channelType="whatsapp"
                existing={whatsappChannel}
                configKeys={['phone', 'api_key']}
              />
            </CardContent>
          </Card>
        </div>
      </SectionBlock>
    </div>
  )
}
