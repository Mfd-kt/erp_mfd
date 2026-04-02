import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getDebtById } from '@/modules/debts/queries'
import { getPaymentsByDebt } from '@/modules/payments/queries'
import { getCreditors } from '@/modules/creditors/queries'
import { getDebtCategories } from '@/modules/debt-categories/queries'
import { getDebtTypes } from '@/modules/debt-types/queries'
import { getAccounts } from '@/modules/accounts/queries'
import { DebtDetailView } from '@/modules/debts/components/DebtDetailView'
import type { Company } from '@/lib/supabase/types'

export default async function DebtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; debtId: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { companyId, debtId } = await params
  const sp = await searchParams
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

  const [debt, payments, creditors, debtCategories, debtTypes, accounts, canManage] = await Promise.all([
    getDebtById(companyId, debtId),
    getPaymentsByDebt(companyId, debtId),
    getCreditors(companyId),
    getDebtCategories(companyId),
    getDebtTypes(companyId),
    getAccounts(companyId),
    canManageCompany(supabase, companyId),
  ])

  if (!debt) notFound()

  return (
    <DebtDetailView
      companyId={companyId}
      company={company}
      debt={debt}
      payments={payments}
      creditors={creditors}
      debtCategories={debtCategories}
      debtTypes={debtTypes}
      accounts={accounts}
      canManage={canManage}
      initialOpenPayment={sp.action === 'pay'}
    />
  )
}
