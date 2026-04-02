'use server'

import { createClient } from '@/lib/supabase/server'
import { assertCanManageCompany } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

interface AutomationRuleForm {
  id?: string
  name: string
  trigger_type: string
  min_amount?: number | null
  priority?: string | null
  currency_code?: string | null
  action_type: 'create_notification' | 'create_alert' | 'trigger_webhook'
  action_title?: string | null
  action_message?: string | null
  notification_type?: 'info' | 'warning' | 'critical' | 'success' | null
  severity?: 'info' | 'warning' | 'critical' | null
  is_active: boolean
}

function buildPayload(companyId: string, form: AutomationRuleForm) {
  return {
    company_id: companyId,
    name: form.name,
    trigger_type: form.trigger_type,
    condition_json: {
      ...(form.min_amount != null ? { min_amount: form.min_amount } : {}),
      ...(form.priority ? { priority: form.priority } : {}),
      ...(form.currency_code ? { currency_code: form.currency_code } : {}),
    },
    action_json: {
      type: form.action_type,
      ...(form.action_title ? { title: form.action_title } : {}),
      ...(form.action_message ? { message: form.action_message } : {}),
      ...(form.notification_type ? { notification_type: form.notification_type } : {}),
      ...(form.severity ? { severity: form.severity } : {}),
    },
    is_active: form.is_active,
  }
}

export async function createAutomationRule(companyId: string, form: AutomationRuleForm) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const payload = buildPayload(companyId, form)
  const { error } = await supabase.from('automation_rules').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/automations`)
}

export async function updateAutomationRule(companyId: string, form: AutomationRuleForm) {
  if (!form.id) throw new Error('Identifiant manquant')
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const payload = buildPayload(companyId, form)
  const { error } = await supabase.from('automation_rules').update(payload).eq('id', form.id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/automations`)
}

export async function deleteAutomationRule(companyId: string, id: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase.from('automation_rules').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/automations`)
}
