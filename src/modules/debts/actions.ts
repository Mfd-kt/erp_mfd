'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { debtSchema, updateDebtSchema } from './schema'
import { logActivity } from '@/modules/activity/service'

export async function createDebt(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = debtSchema.parse(formData)
  const amountOriginal = parsed.amount_original
  const currencyCode = parsed.currency_code
  const payload = {
    company_id: companyId,
    title: parsed.title,
    creditor_id: parsed.creditor_id,
    debt_category_id: parsed.debt_category_id,
    amount_original: amountOriginal,
    currency_code: currencyCode,
    fx_rate_to_company_currency: 1,
    amount_company_currency: amountOriginal,
    incurred_date: parsed.incurred_date,
    due_date: parsed.due_date || null,
    priority: parsed.priority,
    notes: parsed.notes ?? null,
    is_recurring_instance: false,
    source_recurring_rule_id: null,
    status: 'open',
  }
  const { data, error } = await supabase.from('debts').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'debt_created',
    entityType: 'debt',
    entityId: data?.id ?? null,
    metadata: { title: parsed.title, amount_original: parsed.amount_original, priority: parsed.priority },
  })
  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}

export async function updateDebt(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = updateDebtSchema.parse(formData)
  const { id, ...rest } = parsed
  const payload = {
    title: rest.title,
    creditor_id: rest.creditor_id,
    debt_category_id: rest.debt_category_id,
    amount_original: rest.amount_original,
    currency_code: rest.currency_code,
    incurred_date: rest.incurred_date,
    due_date: rest.due_date ?? null,
    priority: rest.priority,
    notes: rest.notes ?? null,
    fx_rate_to_company_currency: 1,
    amount_company_currency: rest.amount_original,
  }
  const { error } = await supabase
    .from('debts')
    .update(payload)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'debt_updated',
    entityType: 'debt',
    entityId: id,
    metadata: { title: rest.title, amount_original: rest.amount_original, priority: rest.priority },
  })
  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/debts/${id}`)
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}

export async function deleteDebt(companyId: string, debtId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: payments } = await supabase
    .from('payments')
    .select('id')
    .eq('debt_id', debtId)
    .limit(1)
  if (payments && payments.length > 0) {
    throw new Error('Impossible de supprimer une dette qui a des paiements. Supprimez d\'abord les paiements.')
  }
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debtId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/dashboard`)
}
