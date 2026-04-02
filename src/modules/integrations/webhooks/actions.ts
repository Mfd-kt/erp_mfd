'use server'

import { createClient } from '@/lib/supabase/server'
import { assertCanManageCompany } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

interface WebhookForm {
  id?: string
  event_type: string
  url: string
  secret?: string | null
  is_active: boolean
}

export async function createWebhook(companyId: string, form: WebhookForm) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase.from('webhooks').insert({
    company_id: companyId,
    event_type: form.event_type,
    url: form.url,
    secret: form.secret ?? null,
    is_active: form.is_active,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/webhooks`)
}

export async function updateWebhook(companyId: string, form: WebhookForm) {
  if (!form.id) throw new Error('Identifiant manquant')
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase.from('webhooks').update({
    event_type: form.event_type,
    url: form.url,
    secret: form.secret ?? null,
    is_active: form.is_active,
  }).eq('id', form.id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/webhooks`)
}

export async function deleteWebhook(companyId: string, id: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase.from('webhooks').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/webhooks`)
}
