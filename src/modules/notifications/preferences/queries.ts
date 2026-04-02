import { createClient } from '@/lib/supabase/server'

export interface NotificationPreferences {
  id: string
  user_id: string
  morning_time: string
  evening_time: string
  channels_enabled: string[]
  enable_daily_plan: boolean
  enable_overdue_alerts: boolean
  enable_sprint_alerts: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  morning_time: '08:00',
  evening_time: '18:00',
  channels_enabled: ['slack'],
  enable_daily_plan: true,
  enable_overdue_alerts: true,
  enable_sprint_alerts: true,
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data as NotificationPreferences | null
}

export async function getOrCreateNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const existing = await getNotificationPreferences(userId)
  if (existing) return existing

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({
      user_id: userId,
      ...DEFAULT_PREFERENCES,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as NotificationPreferences
}
