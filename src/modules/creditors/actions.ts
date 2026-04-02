'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { creditorSchema, updateCreditorSchema } from './schema'

export async function createCreditor(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = creditorSchema.parse(formData)
  const payload = {
    ...parsed,
    company_id: companyId,
    email: parsed.email === '' ? null : parsed.email ?? null,
  }
  const { data, error } = await supabase.from('creditors').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/creditors`)
  revalidatePath(`/app/${companyId}/debts`)
  return { id: data.id }
}

export async function updateCreditor(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = updateCreditorSchema.parse(formData)
  const { id, ...rest } = parsed
  const payload = {
    ...rest,
    email: rest.email === '' ? null : rest.email ?? null,
  }
  const { error } = await supabase.from('creditors').update(payload).eq('id', id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/creditors`)
}

export async function deleteCreditor(companyId: string, creditorId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase
    .from('creditors')
    .delete()
    .eq('id', creditorId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/creditors`)
}
