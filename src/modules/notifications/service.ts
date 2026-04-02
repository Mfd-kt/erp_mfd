import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/lib/supabase/types'

interface CreateNotificationInput {
  userId: string
  companyId?: string | null
  title: string
  message: string
  type: NotificationType
}

export async function createNotification(supabase: SupabaseClient, input: CreateNotificationInput) {
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    company_id: input.companyId ?? null,
    title: input.title,
    message: input.message,
    type: input.type,
    is_read: false,
  })
  if (error) console.error('createNotification failed', error)
}

export async function notifyCompanyMembers(
  supabase: SupabaseClient,
  companyId: string,
  payload: Omit<CreateNotificationInput, 'userId' | 'companyId'>
) {
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('company_id', companyId)

  if (error) {
    console.error('notifyCompanyMembers memberships failed', error)
    return
  }

  const userIds = Array.from(new Set((data ?? []).map((m: { user_id: string }) => m.user_id).filter(Boolean)))
  if (!userIds.length) return

  const rows = userIds.map((userId) => ({
    user_id: userId,
    company_id: companyId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    is_read: false,
  }))

  const { error: insertError } = await supabase.from('notifications').insert(rows)
  if (insertError) console.error('notifyCompanyMembers insert failed', insertError)
}
