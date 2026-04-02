'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { debtTypeSchema, updateDebtTypeSchema } from './schema'

export async function createDebtType(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = debtTypeSchema.parse(formData)
  const payload = { ...parsed, company_id: companyId }
  const { data, error } = await supabase.from('debt_types').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debt-types`)
  revalidatePath(`/app/${companyId}/debt-categories`)
  revalidatePath(`/app/${companyId}/debts`)
  return { id: data.id }
}

export async function updateDebtType(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = updateDebtTypeSchema.parse(formData)
  const { id, ...rest } = parsed
  const { error } = await supabase
    .from('debt_types')
    .update(rest)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debt-types`)
}

export async function deleteDebtType(companyId: string, debtTypeId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)

  const { count, error: countError } = await supabase
    .from('debt_categories')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('debt_type_id', debtTypeId)
  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) {
    throw new Error(
      `Suppression impossible: ce type est utilisé par ${count} catégorie(s). ` +
        `Modifie d'abord ces catégories (ou réassigne-les à un autre type), puis réessaie.`
    )
  }

  const { error } = await supabase
    .from('debt_types')
    .delete()
    .eq('id', debtTypeId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/debt-types`)
}

export async function getDebtTypeUsage(companyId: string, debtTypeId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)

  const { count, error } = await supabase
    .from('debt_categories')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('debt_type_id', debtTypeId)
  if (error) throw new Error(error.message)

  return { categoriesCount: count ?? 0 }
}

export async function reassignAndDeleteDebtType(
  companyId: string,
  debtTypeId: string,
  replacementDebtTypeId: string
) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)

  if (debtTypeId === replacementDebtTypeId) {
    throw new Error('Le type de remplacement doit être différent.')
  }

  const { data: replacement, error: replacementError } = await supabase
    .from('debt_types')
    .select('id, company_id')
    .eq('id', replacementDebtTypeId)
    .single()
  if (replacementError || !replacement) {
    throw new Error('Type de remplacement introuvable.')
  }
  if (replacement.company_id !== null && replacement.company_id !== companyId) {
    throw new Error('Le type de remplacement doit appartenir à la société active.')
  }

  const { error: updateCategoriesError } = await supabase
    .from('debt_categories')
    .update({ debt_type_id: replacementDebtTypeId })
    .eq('company_id', companyId)
    .eq('debt_type_id', debtTypeId)
  if (updateCategoriesError) throw new Error(updateCategoriesError.message)

  const { error: deleteError } = await supabase
    .from('debt_types')
    .delete()
    .eq('id', debtTypeId)
    .eq('company_id', companyId)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath(`/app/${companyId}/debt-types`)
  revalidatePath(`/app/${companyId}/debt-categories`)
  revalidatePath(`/app/${companyId}/debts`)
}
