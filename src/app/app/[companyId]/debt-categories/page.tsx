import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getDebtTypes } from '@/modules/debt-types/queries'
import { getDebtCategories } from '@/modules/debt-categories/queries'
import { DebtCategoriesView } from '@/modules/debt-categories/components/DebtCategoriesView'
import type { Company } from '@/lib/supabase/types'

export default async function DebtCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { companyId } = await params
  const resolved = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (!companyRow) notFound()
  const company = companyRow as Company

  const debt_type_id = typeof resolved?.debt_type_id === 'string' ? resolved.debt_type_id : undefined

  const [debtTypes, debtCategories, canManage] = await Promise.all([
    getDebtTypes(companyId),
    getDebtCategories(companyId, { debt_type_id }),
    canManageCompany(supabase, companyId),
  ])

  return (
    <DebtCategoriesView
      companyId={companyId}
      company={company}
      debtTypes={debtTypes}
      debtCategories={debtCategories}
      canManage={canManage}
    />
  )
}
