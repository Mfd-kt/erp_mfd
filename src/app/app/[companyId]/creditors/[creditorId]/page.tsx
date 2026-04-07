import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getAccounts } from '@/modules/accounts/queries'
import { getCreditorById, getCreditors } from '@/modules/creditors/queries'
import { getDebtCategories } from '@/modules/debt-categories/queries'
import { getDebtTypes } from '@/modules/debt-types/queries'
import { getDebtsWithRemaining } from '@/modules/debts/queries'
import { getPaymentsByDebtIds } from '@/modules/payments/queries'
import { getRecurringRules } from '@/modules/recurring-rules/queries'
import { CreditorDetailView } from '@/modules/creditors/components/CreditorDetailView'
import type { Company } from '@/lib/supabase/types'
import type { RecurringRuleRow } from '@/modules/recurring-rules/types'

export default async function CreditorDetailPage({ params }: { params: Promise<{ companyId: string; creditorId: string }> }) {
  const { companyId, creditorId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRow } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!companyRow) notFound()
  const company = companyRow as Company

  const creditor = await getCreditorById(companyId, creditorId)
  if (!creditor) notFound()

  const [
    debts,
    recurringRules,
    creditors,
    debtCategories,
    debtTypes,
    accounts,
    canManage,
  ] = await Promise.all([
    getDebtsWithRemaining(companyId, { creditor_id: creditorId }),
    getRecurringRules(companyId, { creditor_id: creditorId }),
    getCreditors(companyId),
    getDebtCategories(companyId),
    getDebtTypes(companyId),
    getAccounts(companyId),
    canManageCompany(supabase, companyId),
  ])

  const debtIds = debts.map((d) => d.id)
  const payments = await getPaymentsByDebtIds(companyId, debtIds)

  return (
    <CreditorDetailView
      companyId={companyId}
      company={company}
      creditor={creditor}
      debts={debts}
      payments={payments}
      recurringRules={recurringRules as RecurringRuleRow[]}
      creditors={creditors}
      debtCategories={debtCategories}
      debtTypes={debtTypes}
      accounts={accounts}
      canManage={canManage}
    />
  )
}
