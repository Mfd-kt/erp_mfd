import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { readTools } from './tools'
import type { AssistantContext } from './types'
import { getDailyPlan } from '@/modules/planning/queries'
import { generateDailyPlan } from '@/modules/planning/service'
import { upsertDailyPlan } from '@/modules/planning/queries'
import { getCompaniesByGroup } from '@/modules/companies/queries'
import { sendToChannel } from '@/modules/notifications/channels'

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY manquant')
  return new OpenAI({ apiKey: key })
}

/**
 * Run daily assistant digest for a user.
 * Idempotent: skips if a completed digest already exists for today (user/day/scope).
 * Generates a short executive briefing and optionally sends via Slack/WhatsApp.
 */
export async function runDailyAssistantDigest(
  userId: string,
  supabase: SupabaseClient,
  options?: { scopeType?: 'global' | 'business' | 'personal'; force?: boolean }
): Promise<{ success: boolean; summary?: string; error?: string; skipped?: boolean }> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const scopeType = options?.scopeType ?? 'global'

    if (!options?.force) {
      const { data: existing } = await supabase
        .from('assistant_runs')
        .select('id, summary')
        .eq('user_id', userId)
        .eq('trigger_type', 'daily_digest')
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`)
        .limit(1)
        .maybeSingle()
      if (existing?.summary) {
        return { success: true, summary: existing.summary, skipped: true }
      }
    }
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: memberships } = await supabase
      .from('memberships')
      .select('group_id, company_id')
      .eq('user_id', userId)

    const groupAdmin = memberships?.find((m) => !m.company_id)
    let companyIds: string[] = []
    let groupId: string | null = null
    let baseCurrency = 'EUR'
    if (groupAdmin?.group_id) {
      groupId = groupAdmin.group_id
      const companies = await getCompaniesByGroup(groupAdmin.group_id, supabase)
      companyIds = companies.map((c) => c.id)
      const { data: groupRow } = await supabase.from('groups').select('base_currency').eq('id', groupId).single()
      baseCurrency = (groupRow as { base_currency?: string })?.base_currency ?? 'EUR'
    } else {
      companyIds = (memberships ?? [])
        .filter((m): m is typeof m & { company_id: string } => Boolean(m.company_id))
        .map((m) => m.company_id)
    }

    const { data: companies } = await supabase
      .from('companies')
      .select('id, legal_name, trade_name, default_currency')
      .in('id', companyIds)

    const ctx: AssistantContext = {
      userId,
      scopeType: 'global',
      companyId: null,
      companyIds,
      companies: (companies ?? []).map((c) => ({
        id: c.id,
        legal_name: (c as { legal_name: string }).legal_name,
        trade_name: (c as { trade_name?: string }).trade_name ?? null,
        default_currency: (c as { default_currency: string }).default_currency,
      })),
      groupBaseCurrency: baseCurrency,
      groupId,
      supabase,
    }

    const planDate = new Date().toISOString().slice(0, 10)
    let plan = await getDailyPlan(userId, planDate, supabase)
    if (!plan?.primary_task_id && !plan?.secondary_task_1_id && !plan?.secondary_task_2_id) {
      const result = await generateDailyPlan(supabase, userId, planDate, { companyIds })
      await upsertDailyPlan(userId, planDate, {
        primary_task_id: result.primaryTask?.id ?? null,
        secondary_task_1_id: result.secondaryTasks[0]?.id ?? null,
        secondary_task_2_id: result.secondaryTasks[1]?.id ?? null,
        status: 'draft',
        plan_metadata: result.taskReasons,
      }, supabase)
      plan = await getDailyPlan(userId, planDate, supabase)
    }

    const [dashboard, alerts, forecast, dailyPlan, safeWithdrawal] = await Promise.all([
      readTools.get_global_dashboard(ctx, 30),
      readTools.get_recent_alerts(ctx),
      readTools.get_global_forecast(ctx, 3),
      readTools.get_daily_plan(ctx, planDate),
      readTools.get_safe_withdrawal_capacity(ctx),
    ])

    const dataBloc = JSON.stringify({
      dashboard: dashboard.success ? dashboard.data : null,
      alerts: alerts.success ? alerts.data : null,
      forecast: forecast.success ? forecast.data : null,
      dailyPlan: dailyPlan.success ? dailyPlan.data : null,
      safeWithdrawal: safeWithdrawal.success ? safeWithdrawal.data : null,
    })

    const dataQuality = {
      hasDashboard: dashboard.success,
      hasAlerts: alerts.success,
      hasForecast: forecast.success,
      hasDailyPlan: dailyPlan.success,
      hasSafeWithdrawal: safeWithdrawal.success,
    }

    const response = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es le copilote financier. Génère un briefing quotidien EXECUTIF très court (max 15 lignes) en français.
Format:
1. Situation globale (1 phrase)
2. Risque principal (1 phrase)
3. Action prioritaire du jour (1 phrase)
4. Deux actions secondaires (2 phrases)
5. Points à surveiller (1-2 phrases)
6. Optionnel: suggestion de sprint si pertinent

Règles:
- Sois concret, factuel, pas de verbiage. Ne invente rien.
- Si des données manquent (forecast incomplet, pas de plan du jour), indique-le clairement.
- Si prévision incomplète: dis "Prévision incomplète" ou similaire.
- Scope: ${scopeType}.

Ne crée pas de panique. Préfère 1 recommandation principale et 2 secondaires.`,
        },
        {
          role: 'user',
          content: `Données ERP (scope: ${scopeType}):\n${dataBloc}\n\nQualité des données: ${JSON.stringify(dataQuality)}\n\nGénère le briefing.`,
        },
      ],
    })

    const summary = response.choices[0]?.message?.content ?? ''

    await supabase.from('assistant_runs').insert({
      user_id: userId,
      trigger_type: 'daily_digest',
      status: 'completed',
      summary,
      metadata_json: {
        scope_type: scopeType,
        dashboard: dashboard.success,
        alerts: alerts.success,
        forecast: forecast.success,
        daily_plan: dailyPlan.success,
      },
      completed_at: new Date().toISOString(),
    })

    const channelsEnabled = (prefs?.channels_enabled as string[]) ?? ['slack']
    const enableDailyPlan = prefs?.enable_daily_plan ?? true

    if (enableDailyPlan && channelsEnabled.includes('slack')) {
      const { data: channel } = await supabase
        .from('notification_channels')
        .select('config_json')
        .eq('user_id', userId)
        .eq('channel_type', 'slack')
        .eq('is_active', true)
        .single()
      const config = (channel?.config_json as { webhook_url?: string }) ?? {}
      if (config.webhook_url) {
        await sendToChannel('slack', config, {
          title: 'Briefing du jour',
          message: summary,
        })
      }
    }

    return { success: true, summary }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    await supabase.from('assistant_runs').insert({
      user_id: userId,
      trigger_type: 'daily_digest',
      status: 'failed',
      metadata_json: { error: err },
      completed_at: new Date().toISOString(),
    })
    return { success: false, error: err }
  }
}
