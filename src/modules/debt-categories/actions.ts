'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { debtCategorySchema, updateDebtCategorySchema } from './schema'

export async function createDebtCategory(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = debtCategorySchema.parse(formData)
  const payload = { ...parsed, company_id: companyId }
  const { data, error } = await supabase.from('debt_categories').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debt-categories`)
  revalidatePath(`/app/${companyId}/debts`)
  return { id: data.id }
}

export async function updateDebtCategory(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = updateDebtCategorySchema.parse(formData)
  const { id, ...rest } = parsed
  const { error } = await supabase
    .from('debt_categories')
    .update(rest)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debt-categories`)
}

export async function deleteDebtCategory(companyId: string, debtCategoryId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)

  const [{ count: debtsCount, error: debtsCountError }, { count: rulesCount, error: rulesCountError }] =
    await Promise.all([
      supabase
        .from('debts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('debt_category_id', debtCategoryId),
      supabase
        .from('recurring_rules')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('debt_category_id', debtCategoryId),
    ])
  if (debtsCountError) throw new Error(debtsCountError.message)
  if (rulesCountError) throw new Error(rulesCountError.message)

  const linkedDebts = debtsCount ?? 0
  const linkedRules = rulesCount ?? 0
  if (linkedDebts > 0 || linkedRules > 0) {
    throw new Error(
      `Suppression impossible: cette catégorie est utilisée par ${linkedDebts} dette(s)` +
        ` et ${linkedRules} règle(s) récurrente(s). ` +
        `Réassigne ou supprime ces éléments, puis réessaie.`
    )
  }

  const { error } = await supabase
    .from('debt_categories')
    .delete()
    .eq('id', debtCategoryId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debt-categories`)
}

export async function getDebtCategoryUsage(companyId: string, debtCategoryId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)

  const [{ count: debtsCount, error: debtsCountError }, { count: rulesCount, error: rulesCountError }] =
    await Promise.all([
      supabase
        .from('debts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('debt_category_id', debtCategoryId),
      supabase
        .from('recurring_rules')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('debt_category_id', debtCategoryId),
    ])
  if (debtsCountError) throw new Error(debtsCountError.message)
  if (rulesCountError) throw new Error(rulesCountError.message)

  return {
    debtsCount: debtsCount ?? 0,
    rulesCount: rulesCount ?? 0,
  }
}

export async function reassignAndDeleteDebtCategory(
  companyId: string,
  debtCategoryId: string,
  replacementDebtCategoryId: string
) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)

  if (debtCategoryId === replacementDebtCategoryId) {
    throw new Error('La catégorie de remplacement doit être différente.')
  }

  const { data: replacement, error: replacementError } = await supabase
    .from('debt_categories')
    .select('id')
    .eq('id', replacementDebtCategoryId)
    .eq('company_id', companyId)
    .single()
  if (replacementError || !replacement) {
    throw new Error('Catégorie de remplacement introuvable.')
  }

  const { error: updateDebtsError } = await supabase
    .from('debts')
    .update({ debt_category_id: replacementDebtCategoryId })
    .eq('company_id', companyId)
    .eq('debt_category_id', debtCategoryId)
  if (updateDebtsError) throw new Error(updateDebtsError.message)

  const { error: updateRulesError } = await supabase
    .from('recurring_rules')
    .update({ debt_category_id: replacementDebtCategoryId, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('debt_category_id', debtCategoryId)
  if (updateRulesError) throw new Error(updateRulesError.message)

  const { error: deleteError } = await supabase
    .from('debt_categories')
    .delete()
    .eq('id', debtCategoryId)
    .eq('company_id', companyId)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath(`/app/${companyId}/debt-categories`)
  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/recurring-rules`)
}
