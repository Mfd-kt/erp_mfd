'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { revenueSchema, updateRevenueSchema, receiveRevenueSchema } from './schema'
import { getRevenueById } from './queries'
import { getAccountById } from '@/modules/accounts/queries'
import { logActivity } from '@/modules/activity/service'
import { notifyCompanyMembers } from '@/modules/notifications/service'
import { runAutomationsForTrigger } from '@/modules/automation/service'

function isRevenueClientSchemaError(message: string) {
  return (
    message.includes('revenue_clients') ||
    message.includes('client_id') ||
    message.includes('revenue_category')
  )
}

function buildLegacyNotes(
  notes: string | null | undefined,
  revenueCategory: 'client' | 'goods_sale' | 'other'
) {
  const marker = `[rev_category:${revenueCategory}]`
  const base = (notes ?? '').replace(/\s*\[rev_category:(client|goods_sale|other)\]\s*/g, '').trim()
  return base ? `${base}\n${marker}` : marker
}

async function resolveRevenueClientId(
  companyId: string,
  clientId: string | null | undefined,
  clientName: string | null | undefined
) {
  const normalizedName = clientName?.trim()
  const supabase = await createClient()
  if (clientId) return clientId
  if (!normalizedName) return null

  const { data: existing, error: existingError } = await supabase
    .from('revenue_clients')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', normalizedName)
    .maybeSingle()
  if (existingError) {
    if (isRevenueClientSchemaError(existingError.message)) return null
    throw new Error(existingError.message)
  }
  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from('revenue_clients')
    .insert({ company_id: companyId, name: normalizedName })
    .select('id')
    .single()
  if (error) {
    if (isRevenueClientSchemaError(error.message)) return null
    throw new Error(error.message)
  }
  return data.id as string
}

export async function createRevenue(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = revenueSchema.parse(formData)
  const typedClientName = parsed.client_name?.trim() || null
  const normalizedSourceName =
    parsed.revenue_category === 'client'
      ? typedClientName ?? parsed.source_name ?? null
      : parsed.source_name ?? null
  const clientId =
    parsed.revenue_category === 'client'
      ? await resolveRevenueClientId(companyId, parsed.client_id, parsed.client_name)
      : null
  const payload = {
    company_id: companyId,
    title: parsed.title,
    client_id: clientId,
    revenue_category: parsed.revenue_category,
    source_name: normalizedSourceName,
    amount_expected: parsed.amount_expected,
    amount_received: 0,
    currency_code: parsed.currency_code,
    expected_date: parsed.expected_date,
    received_date: null,
    account_id: null,
    status: 'expected',
    notes: parsed.notes ?? null,
  }
  let { data, error } = await supabase.from('revenues').insert(payload).select('id').single()
  if (error && isRevenueClientSchemaError(error.message)) {
    const legacyPayload = {
      company_id: companyId,
      title: parsed.title,
      source_name: normalizedSourceName,
      amount_expected: parsed.amount_expected,
      amount_received: 0,
      currency_code: parsed.currency_code,
      expected_date: parsed.expected_date,
      received_date: null,
      account_id: null,
      status: 'expected',
      notes: buildLegacyNotes(parsed.notes ?? null, parsed.revenue_category),
    }
    const fallback = await supabase.from('revenues').insert(legacyPayload).select('id').single()
    data = fallback.data
    error = fallback.error
  }
  if (error) throw new Error(error.message)
  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'revenue_created',
    entityType: 'revenue',
    entityId: data?.id ?? null,
    metadata: { title: parsed.title, amount_expected: parsed.amount_expected, expected_date: parsed.expected_date },
  })
  revalidatePath(`/app/${companyId}/revenues`)
  revalidatePath(`/app/${companyId}/accounts`)
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}

export async function updateRevenue(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = updateRevenueSchema.parse(formData)
  const { id, ...rest } = parsed
  const typedClientName = rest.client_name?.trim() || null
  const normalizedSourceName =
    rest.revenue_category === 'client'
      ? typedClientName ?? rest.source_name ?? null
      : rest.source_name ?? null
  const clientId =
    rest.revenue_category === 'client'
      ? await resolveRevenueClientId(companyId, rest.client_id, rest.client_name)
      : null
  const payload = {
    title: rest.title,
    client_id: clientId,
    revenue_category: rest.revenue_category,
    source_name: normalizedSourceName,
    amount_expected: rest.amount_expected,
    currency_code: rest.currency_code,
    expected_date: rest.expected_date,
    notes: rest.notes ?? null,
  }
  let { error } = await supabase
    .from('revenues')
    .update(payload)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error && isRevenueClientSchemaError(error.message)) {
    const legacyPayload = {
      title: rest.title,
      source_name: normalizedSourceName,
      amount_expected: rest.amount_expected,
      currency_code: rest.currency_code,
      expected_date: rest.expected_date,
      notes: buildLegacyNotes(rest.notes ?? null, rest.revenue_category),
    }
    const fallback = await supabase
      .from('revenues')
      .update(legacyPayload)
      .eq('id', id)
      .eq('company_id', companyId)
    error = fallback.error
  }
  if (error) throw new Error(error.message)
  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'revenue_updated',
    entityType: 'revenue',
    entityId: id,
    metadata: { title: rest.title, amount_expected: rest.amount_expected, expected_date: rest.expected_date },
  })
  revalidatePath(`/app/${companyId}/revenues`)
  revalidatePath(`/app/${companyId}/revenues/${id}`)
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}

export async function receiveRevenue(
  companyId: string,
  revenueId: string,
  formData: unknown
) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = receiveRevenueSchema.parse(formData)

  const revenue = await getRevenueById(companyId, revenueId)
  if (!revenue) throw new Error('Revenu introuvable.')
  if (revenue.company_id !== companyId) throw new Error('Revenu d\'une autre société.')

  const expected = Number(revenue.amount_expected) || 0
  if (parsed.amount_received < 0) throw new Error('Le montant reçu doit être positif ou nul.')
  if (parsed.amount_received > expected) {
    throw new Error(`Le montant reçu ne peut pas dépasser le montant attendu (${expected}).`)
  }
  if (parsed.amount_received > 0) {
    if (!parsed.received_date) throw new Error('La date de réception est requise.')
    const account = await getAccountById(companyId, parsed.account_id)
    if (!account) throw new Error('Compte introuvable.')
    if (account.company_id !== companyId) throw new Error('Le compte doit appartenir à la même société.')
  }

  const currentReceived = Number(revenue.amount_received) || 0
  const newReceived = parsed.amount_received
  const status = newReceived >= expected ? 'received' : newReceived > 0 ? 'partial' : revenue.status

  const { error } = await supabase
    .from('revenues')
    .update({
      amount_received: newReceived,
      received_date: newReceived > 0 ? parsed.received_date : null,
      account_id: newReceived > 0 ? parsed.account_id : null,
      status,
      notes: parsed.notes ?? revenue.notes,
    })
    .eq('id', revenueId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'revenue_received',
    entityType: 'revenue',
    entityId: revenueId,
    metadata: { previous_amount_received: currentReceived, new_amount_received: newReceived, status },
  })
  await notifyCompanyMembers(supabase, companyId, {
    title: 'Encaissement enregistré',
    message: `${newReceived.toFixed(2)} ${revenue.currency_code} reçus sur ${revenue.title}.`,
    type: 'success',
  })
  await runAutomationsForTrigger(supabase, companyId, 'revenue_overdue', {
    amount: expected - newReceived,
    currency_code: revenue.currency_code,
    entityType: 'revenue',
    entityId: revenueId,
    title: revenue.title,
    userId: user?.id ?? null,
  })
  revalidatePath(`/app/${companyId}/revenues`)
  revalidatePath(`/app/${companyId}/revenues/${revenueId}`)
  revalidatePath(`/app/${companyId}/accounts`)
  if (parsed.account_id) {
    revalidatePath(`/app/${companyId}/accounts/${parsed.account_id}`)
  }
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}

export async function deleteRevenue(companyId: string, revenueId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const revenue = await getRevenueById(companyId, revenueId)
  if (!revenue) throw new Error('Revenu introuvable.')
  const received = Number(revenue.amount_received) || 0
  if (received > 0) {
    throw new Error('Impossible de supprimer un revenu déjà partiellement ou totalement reçu.')
  }
  const { error } = await supabase
    .from('revenues')
    .delete()
    .eq('id', revenueId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/revenues`)
  revalidatePath(`/app/${companyId}/dashboard`)
}
