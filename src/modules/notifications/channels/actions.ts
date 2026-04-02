'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertNotificationChannel(
  channelType: 'slack' | 'whatsapp',
  config: Record<string, string>,
  isActive = true
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: existing } = await supabase
    .from('notification_channels')
    .select('id')
    .eq('user_id', user.id)
    .eq('channel_type', channelType)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('notification_channels')
      .update({ config_json: config, is_active: isActive })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    revalidatePath('/app/notifications/channels')
    return data
  }

  const { data, error } = await supabase
    .from('notification_channels')
    .insert({
      user_id: user.id,
      company_id: null,
      channel_type: channelType,
      config_json: config,
      is_active: isActive,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/app/notifications/channels')
  return data
}
