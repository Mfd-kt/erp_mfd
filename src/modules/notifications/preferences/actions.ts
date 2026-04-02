'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateNotificationPreferences } from './queries'
import { sendToChannel } from '@/modules/notifications/channels'

export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const { data: channel } = await supabase
    .from('notification_channels')
    .select('config_json')
    .eq('user_id', user.id)
    .eq('channel_type', 'slack')
    .eq('is_active', true)
    .single()

  const config = (channel?.config_json as { webhook_url?: string }) ?? {}
  if (!config.webhook_url) {
    return { success: false, error: 'Configurez Slack dans Canaux d\'abord.' }
  }

  const result = await sendToChannel('slack', config, {
    title: 'Test ERP MFD',
    message: 'Ceci est un message de test. Vos préférences de notification sont actives.',
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

export async function updateNotificationPreferences(prefs: {
  morning_time?: string
  evening_time?: string
  channels_enabled?: string[]
  enable_daily_plan?: boolean
  enable_overdue_alerts?: boolean
  enable_sprint_alerts?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await getOrCreateNotificationPreferences(user.id)

  const { error } = await supabase
    .from('notification_preferences')
    .update({
      ...prefs,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app/notifications/preferences')
}
