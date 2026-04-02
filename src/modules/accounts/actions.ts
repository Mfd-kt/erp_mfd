'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { accountSchema, updateAccountSchema } from './schema'

const reconcileSchema = z.object({
  accountId: z.string().uuid(),
  targetBalance: z.coerce.number(),
})

export async function createAccount(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = accountSchema.parse(formData)
  const payload = {
    ...parsed,
    company_id: companyId,
    current_balance_cached: parsed.opening_balance,
    balance_reconciliation: 0,
  }
  const { error } = await supabase.from('accounts').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/accounts`)
}

export async function updateAccount(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = updateAccountSchema.parse(formData)
  const { id, ...rest } = parsed
  const { error } = await supabase.from('accounts').update(rest).eq('id', id).eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/accounts`)
  revalidatePath(`/app/${companyId}/accounts/${id}`)
}

/**
 * Met à jour l’ajustement de réconciliation pour que le solde affiché (computed_balance)
 * corresponde au solde réel saisi (ex. relevé bancaire).
 */
export async function reconcileAccountBalance(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = reconcileSchema.parse(formData)

  const { data: row, error: fetchErr } = await supabase
    .from('accounts_with_balance')
    .select('computed_balance, balance_reconciliation')
    .eq('id', parsed.accountId)
    .eq('company_id', companyId)
    .single()

  if (fetchErr || !row) throw new Error('Compte introuvable.')

  const r = row as { computed_balance: number; balance_reconciliation?: number | null }
  const recon = Number(r.balance_reconciliation ?? 0)
  const computed = Number(r.computed_balance)
  const baseFlows = computed - recon
  const newRecon = parsed.targetBalance - baseFlows

  const { error } = await supabase
    .from('accounts')
    .update({ balance_reconciliation: newRecon })
    .eq('id', parsed.accountId)
    .eq('company_id', companyId)

  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/accounts`)
  revalidatePath(`/app/${companyId}/accounts/${parsed.accountId}`)
}

export async function deleteAccount(companyId: string, accountId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/accounts`)
}
