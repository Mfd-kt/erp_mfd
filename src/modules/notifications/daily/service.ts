import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { getDailyPlan } from '@/modules/planning/queries'
import { generateDailyPlan } from '@/modules/planning/service'
import { upsertDailyPlan } from '@/modules/planning/queries'
import { sendToChannel } from '@/modules/notifications/channels'
import { getCompaniesByGroup } from '@/modules/companies/queries'

/**
 * Run daily notifications: morning plan + evening summary.
 * Call from cron every hour; only sends when user's preferred time matches.
 */
export async function runDailyNotificationsJob(): Promise<{
  morning: { sent: number; errors: string[] }
  evening: { sent: number; errors: string[] }
}> {
  const supabase = createServiceClient()
  const now = new Date()
  const hour = now.getHours()
  const hourStr = `${String(hour).padStart(2, '0')}:00`
  const planDate = now.toISOString().slice(0, 10)

  const result = { morning: { sent: 0, errors: [] as string[] }, evening: { sent: 0, errors: [] as string[] } }

  const { data: prefsList } = await supabase
    .from('notification_preferences')
    .select('*')

  const relevant = (prefsList ?? []).filter((p) => {
    const m = String(p.morning_time ?? '').slice(0, 5)
    const e = String(p.evening_time ?? '').slice(0, 5)
    return m === hourStr || e === hourStr
  })

  for (const prefs of relevant) {
    const channels = (prefs.channels_enabled as string[]) ?? ['slack']
    const hasSlack = channels.includes('slack')

    if (prefs.morning_time?.toString().startsWith(hourStr) && prefs.enable_daily_plan && hasSlack) {
      try {
        await sendMorningPlan(supabase, prefs.user_id, planDate)
        result.morning.sent += 1
      } catch (e) {
        result.morning.errors.push(`${prefs.user_id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    if (prefs.evening_time?.toString().startsWith(hourStr) && prefs.enable_daily_plan && hasSlack) {
      try {
        await sendEveningSummary(supabase, prefs.user_id, planDate)
        result.evening.sent += 1
      } catch (e) {
        result.evening.errors.push(`${prefs.user_id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return result
}

async function sendMorningPlan(supabase: SupabaseClient, userId: string, planDate: string) {
  let plan = await getDailyPlan(userId, planDate, supabase)
  if (!plan?.primary_task_id && !plan?.secondary_task_1_id && !plan?.secondary_task_2_id) {
    const scope = await getPlanScope(supabase, userId)
    const result = await generateDailyPlan(supabase, userId, planDate, scope)
    await upsertDailyPlan(userId, planDate, {
      primary_task_id: result.primaryTask?.id ?? null,
      secondary_task_1_id: result.secondaryTasks[0]?.id ?? null,
      secondary_task_2_id: result.secondaryTasks[1]?.id ?? null,
      status: 'draft',
      plan_metadata: result.taskReasons,
    }, supabase)
    plan = await getDailyPlan(userId, planDate, supabase)
  }

  const { data: channel } = await supabase
    .from('notification_channels')
    .select('config_json')
    .eq('user_id', userId)
    .eq('channel_type', 'slack')
    .eq('is_active', true)
    .single()

  const config = (channel?.config_json as { webhook_url?: string }) ?? {}
  if (!config.webhook_url) return

  const primary = plan?.primary_task
  const s1 = plan?.secondary_task_1
  const s2 = plan?.secondary_task_2

  const lines: string[] = ['*Plan du jour*']
  if (primary) {
    lines.push(`• *Principal:* ${primary.title}${plan?.plan_metadata?.primary ? ` (_${plan.plan_metadata.primary}_)` : ''}`)
  } else {
    lines.push('• *Principal:* Aucune tâche')
  }
  if (s1) lines.push(`• *Secondaire 1:* ${s1.title}`)
  if (s2) lines.push(`• *Secondaire 2:* ${s2.title}`)
  if (!primary && !s1 && !s2) lines.push('Aucune tâche planifiée. Générez un plan sur /app/planning')

  await sendToChannel('slack', config, {
    title: 'Plan du jour',
    message: lines.join('\n'),
  })
}

async function sendEveningSummary(supabase: SupabaseClient, userId: string, planDate: string) {
  const plan = await getDailyPlan(userId, planDate, supabase)
  const tasks = [plan?.primary_task, plan?.secondary_task_1, plan?.secondary_task_2].filter(Boolean)
  const completed = tasks.filter((t) => t?.status === 'done')
  const incomplete = tasks.filter((t) => t && t.status !== 'done')

  const { data: channel } = await supabase
    .from('notification_channels')
    .select('config_json')
    .eq('user_id', userId)
    .eq('channel_type', 'slack')
    .eq('is_active', true)
    .single()

  const config = (channel?.config_json as { webhook_url?: string }) ?? {}
  if (!config.webhook_url) return

  const lines: string[] = ['*Résumé du jour*']
  lines.push(`• Terminées: ${completed.length}`)
  if (completed.length) {
    completed.forEach((t) => lines.push(`  ✓ ${t?.title}`))
  }
  lines.push(`• Non terminées: ${incomplete.length}`)
  if (incomplete.length) {
    incomplete.forEach((t) => lines.push(`  ○ ${t?.title}`))
  }

  await sendToChannel('slack', config, {
    title: 'Résumé du jour',
    message: lines.join('\n'),
  })
}

async function getPlanScope(supabase: SupabaseClient, userId: string) {
  const { data: memberships } = await supabase
    .from('memberships')
    .select('group_id, company_id')
    .eq('user_id', userId)

  const groupAdmin = memberships?.find((m) => !m.company_id)
  let companyIds: string[] = []
  if (groupAdmin?.group_id) {
    const companies = await getCompaniesByGroup(groupAdmin.group_id, supabase)
    companyIds = companies.map((c) => c.id)
  } else {
    companyIds = (memberships ?? [])
      .filter((m): m is typeof m & { company_id: string } => Boolean(m.company_id))
      .map((m) => m.company_id)
  }
  return { companyIds }
}
