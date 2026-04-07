import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getRecurringRules } from '@/modules/recurring-rules/queries'
import { getCreditors } from '@/modules/creditors/queries'
import { getDebtCategories } from '@/modules/debt-categories/queries'
import { getDebtTypes } from '@/modules/debt-types/queries'
import { RecurringRulesView } from '@/modules/recurring-rules/components/RecurringRulesView'
import type { Company, DebtType } from '@/lib/supabase/types'
import type { RecurringRuleRow } from '@/modules/recurring-rules/types'

export default async function RecurringRulesPage({
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

  const frequency = typeof resolved?.frequency === 'string' ? resolved.frequency as 'monthly' | 'quarterly' | 'yearly' : undefined
  const is_active = typeof resolved?.is_active === 'string' ? resolved.is_active === 'true' : undefined
  const auto_generate = typeof resolved?.auto_generate === 'string' ? resolved.auto_generate === 'true' : undefined
  const debt_category_id = typeof resolved?.debt_category_id === 'string' ? resolved.debt_category_id : undefined
  const creditor_id = typeof resolved?.creditor_id === 'string' ? resolved.creditor_id : undefined
  const filters = { frequency, is_active, auto_generate, debt_category_id, creditor_id }

  const [rules, creditors, debtCategories, debtTypes, canManage] = await Promise.all([
    getRecurringRules(companyId, filters),
    getCreditors(companyId),
    getDebtCategories(companyId),
    getDebtTypes(companyId),
    canManageCompany(supabase, companyId),
  ])

  return (
    <RecurringRulesView
      companyId={companyId}
      company={company}
      rules={rules as RecurringRuleRow[]}
      creditors={creditors}
      debtCategories={debtCategories}
      debtTypes={debtTypes as DebtType[]}
      canManage={canManage}
    />
  )
}
