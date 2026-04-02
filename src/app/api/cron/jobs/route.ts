import { NextResponse } from 'next/server'
import { runRecurringGenerationJob, runWebhookRetryJob } from '@/modules/jobs/service'
import { runDailyNotificationsJob } from '@/modules/notifications/daily/service'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Cron endpoint for background jobs.
 * Protect with CRON_SECRET in Authorization header or query param.
 * Call from Vercel Cron, cron-job.org, or similar.
 *
 * ?job=recurring_generation | webhook_retry | daily_notifications | daily_assistant | all
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  const jobParam = url.searchParams.get('job') ?? 'all'
  const secret = process.env.CRON_SECRET?.trim()
  const isProd = process.env.NODE_ENV === 'production'
  const allowInsecureDev =
    !isProd && process.env.ALLOW_OPEN_CRON_IN_DEV?.trim() === 'true'

  if (!secret && !allowInsecureDev) {
    return NextResponse.json(
      {
        error: 'CRON_SECRET non configuré.',
        hint:
          'Ajoutez CRON_SECRET dans .env.local à la racine du projet, puis redémarrez le serveur (npm run dev). En développement uniquement, vous pouvez définir ALLOW_OPEN_CRON_IN_DEV=true (voir .env.example).',
      },
      { status: 503 },
    )
  }

  let devInsecureWarning: string | undefined
  if (!secret && allowInsecureDev) {
    devInsecureWarning =
      'Mode développement : cron ouvert (ALLOW_OPEN_CRON_IN_DEV). Ne jamais activer en production.'
  } else {
    const querySecret = url.searchParams.get('secret')
    const bearerToken =
      authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    const authorized =
      bearerToken === secret ||
      (querySecret !== null && querySecret === secret)
    if (!authorized) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  }

  const results: Record<string, unknown> = {}
  if (devInsecureWarning) {
    results._warning = devInsecureWarning
  }

  if (jobParam === 'recurring_generation' || jobParam === 'all') {
    results.recurring = await runRecurringGenerationJob()
  }
  if (jobParam === 'webhook_retry' || jobParam === 'all') {
    results.webhookRetry = await runWebhookRetryJob()
  }
  if (jobParam === 'daily_notifications' || jobParam === 'all') {
    results.dailyNotifications = await runDailyNotificationsJob()
  }
  if (jobParam === 'daily_assistant' || jobParam === 'all') {
    try {
      const { runDailyAssistantDigest } = await import('@/modules/assistant/daily-digest')
      const supabase = createServiceClient()
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('enable_daily_plan', true)
      const userIds = [...new Set((prefs ?? []).map((p) => (p as { user_id: string }).user_id))]
      const digestResults: { userId: string; success: boolean; error?: string }[] = []
      for (const uid of userIds.slice(0, 20)) {
        const r = await runDailyAssistantDigest(uid, supabase)
        digestResults.push({ userId: uid, success: r.success, error: r.error })
      }
      results.dailyAssistant = { runs: digestResults.length, results: digestResults }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      results.dailyAssistant = {
        skipped: true,
        error: message,
        hint:
          message.includes('SUPABASE_SERVICE_ROLE_KEY')
            ? 'Ajoutez SUPABASE_SERVICE_ROLE_KEY au serveur pour ce job.'
            : undefined,
      }
    }
  }

  return NextResponse.json(results)
}
