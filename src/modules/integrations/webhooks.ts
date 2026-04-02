import type { SupabaseClient } from '@supabase/supabase-js'
import { deliverWebhook } from './webhooks/trigger'

export async function triggerWebhooks(
  supabase: SupabaseClient,
  companyId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('webhooks')
    .select('id, url, secret')
    .eq('company_id', companyId)
    .eq('event_type', eventType)
    .eq('is_active', true)

  if (error) {
    const { logError } = await import('@/lib/errors/logger')
    await logError({
      serviceName: 'webhooks',
      functionName: 'triggerWebhooks',
      errorMessage: error.message,
      metadata: { companyId, eventType },
    })
    return
  }

  await Promise.all(
    (data ?? []).map((hook: { id: string; url: string; secret: string | null }) =>
      deliverWebhook(supabase, hook.id, hook.url, hook.secret ?? null, eventType, payload)
    )
  )
}
