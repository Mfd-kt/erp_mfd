import type { SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { logError } from '@/lib/errors/logger'

/**
 * Sign payload with HMAC-SHA256 for webhook verification.
 */
export function signPayload(payload: Record<string, unknown>, secret: string): string {
  const body = JSON.stringify(payload)
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Verify webhook signature (for incoming webhooks - future use).
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return signature === expected
}

/**
 * Deliver a single webhook. Inserts into webhook_deliveries, attempts fetch, updates status.
 */
export async function deliverWebhook(
  supabase: SupabaseClient,
  webhookId: string,
  url: string,
  secret: string | null,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const fullPayload = { eventType, payload }

  const { data: delivery, error: insertErr } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload: fullPayload,
      status: 'pending',
      attempts: 0,
    })
    .select('id')
    .single()

  if (insertErr || !delivery) {
    await logError({
      serviceName: 'webhooks',
      functionName: 'deliverWebhook',
      errorMessage: insertErr?.message ?? 'Failed to create delivery record',
      metadata: { webhookId, eventType },
    })
    return { success: false, error: insertErr?.message }
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (secret) {
    headers['x-webhook-signature'] = signPayload(fullPayload, secret)
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(fullPayload),
    })

    if (res.ok) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'success',
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)
      return { success: true }
    }

    const errText = await res.text()
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        last_error: `${res.status}: ${errText.slice(0, 500)}`,
      })
      .eq('id', delivery.id)
    return { success: false, error: `${res.status}: ${errText.slice(0, 200)}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        last_error: msg,
      })
      .eq('id', delivery.id)
    await logError({
      serviceName: 'webhooks',
      functionName: 'deliverWebhook',
      errorMessage: msg,
      metadata: { webhookId, eventType },
    })
    return { success: false, error: msg }
  }
}
