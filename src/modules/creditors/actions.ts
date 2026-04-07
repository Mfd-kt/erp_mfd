'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import type { Database } from '@/lib/supabase/types'
import { creditorSchema, updateCreditorSchema } from './schema'

type CreditorInsert = Database['public']['Tables']['creditors']['Insert']
type CreditorUpdate = Database['public']['Tables']['creditors']['Update']

function emptyToNull(s: string | undefined) {
  return s?.trim() ? s.trim() : null
}

export async function createCreditor(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = creditorSchema.parse(formData)
  const payload: CreditorInsert = {
    company_id: companyId,
    name: parsed.name,
    creditor_type: parsed.creditor_type,
    country_code: parsed.country_code ?? null,
    email: parsed.email === '' ? null : parsed.email ?? null,
    phone: emptyToNull(parsed.phone ?? undefined),
    notes: emptyToNull(parsed.notes ?? undefined),
    company_registration: emptyToNull(parsed.company_registration),
    address_street: emptyToNull(parsed.address_street),
    address_postal_code: emptyToNull(parsed.address_postal_code),
    address_city: emptyToNull(parsed.address_city),
    address_country: emptyToNull(parsed.address_country),
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
  const payload: CreditorUpdate = {
    name: rest.name,
    creditor_type: rest.creditor_type,
    country_code: rest.country_code ?? null,
    email: rest.email === '' ? null : rest.email ?? null,
    phone: emptyToNull(rest.phone ?? undefined),
    notes: emptyToNull(rest.notes ?? undefined),
    company_registration: emptyToNull(rest.company_registration),
    address_street: emptyToNull(rest.address_street),
    address_postal_code: emptyToNull(rest.address_postal_code),
    address_city: emptyToNull(rest.address_city),
    address_country: emptyToNull(rest.address_country),
  }
  const { error } = await supabase.from('creditors').update(payload).eq('id', id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/creditors`)
  revalidatePath(`/app/${companyId}/creditors/${id}`)
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
