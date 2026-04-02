import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { runRecurringGeneration } from '@/modules/recurring-rules/service'
import { getCompaniesByGroup } from '@/modules/companies/queries'
import { logError } from '@/lib/errors/logger'

export type JobRunStatus = 'running' | 'success' | 'failed'

export interface JobRunResult {
  jobName: string
  status: JobRunStatus
  resultJson?: Record<string, unknown>
  errorMessage?: string
  startedAt: string
  completedAt: string
}

async function createJobRun(supabase: SupabaseClient, jobName: string): Promise<string> {
  const { data, error } = await supabase
    .from('job_runs')
    .insert({ job_name: jobName, status: 'running' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data?.id ?? ''
}

async function completeJobRun(
  supabase: SupabaseClient,
  id: string,
  status: 'success' | 'failed',
  resultJson?: Record<string, unknown>,
  errorMessage?: string
) {
  await supabase
    .from('job_runs')
    .update({
      status,
      result_json: resultJson ?? null,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
}

/**
 * Recurring generation job: run for all companies in all groups.
 * Call daily via cron or API route.
 */
export async function runRecurringGenerationJob(): Promise<JobRunResult> {
  const startedAt = new Date().toISOString()
  const supabase = await createClient()

  let runId: string | undefined
  try {
    runId = await createJobRun(supabase, 'recurring_generation')
  } catch (e) {
    await logError({
      serviceName: 'jobs',
      functionName: 'runRecurringGenerationJob',
      errorMessage: e instanceof Error ? e.message : String(e),
      metadata: { phase: 'create_run' },
    })
    return {
      jobName: 'recurring_generation',
      status: 'failed',
      errorMessage: e instanceof Error ? e.message : String(e),
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }

  const result: { created: number; alreadyGenerated: number; errors: string[]; companies: number } = {
    created: 0,
    alreadyGenerated: 0,
    errors: [],
    companies: 0,
  }

  try {
    const { data: groups } = await supabase.from('groups').select('id')
    const groupIds = (groups ?? []).map((g: { id: string }) => g.id)

    for (const groupId of groupIds) {
      const companies = await getCompaniesByGroup(groupId)
      for (const company of companies) {
        result.companies += 1
        const res = await runRecurringGeneration(supabase, company.id, new Date())
        result.created += res.created
        result.alreadyGenerated += res.alreadyGenerated
        if (res.errors.length) result.errors.push(...res.errors.map((e) => `[${company.trade_name ?? company.legal_name}] ${e}`))
      }
    }

    await completeJobRun(supabase, runId, 'success', result)
    return {
      jobName: 'recurring_generation',
      status: 'success',
      resultJson: result,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logError({
      serviceName: 'jobs',
      functionName: 'runRecurringGenerationJob',
      errorMessage: msg,
      stack: e instanceof Error ? e.stack : undefined,
      metadata: result,
    })
    await completeJobRun(supabase, runId!, 'failed', result, msg)
    return {
      jobName: 'recurring_generation',
      status: 'failed',
      resultJson: result,
      errorMessage: msg,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }
}

/**
 * Webhook retry job: retry failed deliveries (up to 3 attempts).
 */
export async function runWebhookRetryJob(): Promise<JobRunResult> {
  const startedAt = new Date().toISOString()
  const supabase = await createClient()

  let runId: string | undefined
  try {
    runId = await createJobRun(supabase, 'webhook_retry')
  } catch (e) {
    return {
      jobName: 'webhook_retry',
      status: 'failed',
      errorMessage: e instanceof Error ? e.message : String(e),
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }

  const result: { retried: number; succeeded: number; failed: number; errors: string[] } = {
    retried: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  try {
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('id, webhook_id, event_type, payload, attempts')
      .eq('status', 'failed')
      .lt('attempts', 3)
      .limit(50)

    const list = (deliveries ?? []) as Array<{
      id: string
      webhook_id: string
      event_type: string
      payload: Record<string, unknown>
      attempts: number
    }>

    for (const d of list) {
      const { data: hook } = await supabase
        .from('webhooks')
        .select('url, secret')
        .eq('id', d.webhook_id)
        .single()
      if (!hook?.url) {
        result.errors.push(`Delivery ${d.id}: no webhook url`)
        result.failed += 1
        continue
      }

      result.retried += 1
      const { signPayload } = await import('@/modules/integrations/webhooks/trigger')
      const fullPayload = { eventType: d.event_type, payload: d.payload }
      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' }
        if (hook.secret) headers['x-webhook-signature'] = signPayload(fullPayload, hook.secret)

        const res = await fetch(hook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(fullPayload),
        })

        if (res.ok) {
          await supabase
            .from('webhook_deliveries')
            .update({
              status: 'success',
              attempts: d.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              last_error: null,
            })
            .eq('id', d.id)
          result.succeeded += 1
        } else {
          const errText = await res.text()
          await supabase
            .from('webhook_deliveries')
            .update({
              attempts: d.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              last_error: `${res.status}: ${errText.slice(0, 500)}`,
            })
            .eq('id', d.id)
          result.failed += 1
          result.errors.push(`Delivery ${d.id}: ${res.status}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await supabase
          .from('webhook_deliveries')
          .update({
            attempts: d.attempts + 1,
            last_attempt_at: new Date().toISOString(),
            last_error: msg,
          })
          .eq('id', d.id)
        result.failed += 1
        result.errors.push(`Delivery ${d.id}: ${msg}`)
      }
    }

    await completeJobRun(supabase, runId, 'success', result)
    return {
      jobName: 'webhook_retry',
      status: 'success',
      resultJson: result,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await completeJobRun(supabase, runId!, 'failed', result, msg)
    return {
      jobName: 'webhook_retry',
      status: 'failed',
      resultJson: result,
      errorMessage: msg,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }
}

