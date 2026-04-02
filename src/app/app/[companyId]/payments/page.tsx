import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getAccounts } from '@/modules/accounts/queries'
import { getDebtRemainingByDebtId } from '@/modules/debts/queries'
import { getPaymentsByCompany, getPaymentStats } from '@/modules/payments/queries'
import { PaymentsView } from '@/modules/payments/components/PaymentsView'
import type { Company } from '@/lib/supabase/types'

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { companyId } = await params
  const resolvedSearchParams = await searchParams
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

  const from_date = typeof resolvedSearchParams?.from_date === 'string' ? resolvedSearchParams.from_date : undefined
  const to_date = typeof resolvedSearchParams?.to_date === 'string' ? resolvedSearchParams.to_date : undefined
  const debt_id = typeof resolvedSearchParams?.debt_id === 'string' ? resolvedSearchParams.debt_id : undefined
  const filters = { from_date, to_date, debt_id }

  const [payments, stats, accounts, canManage, debtRemainingByDebtId] = await Promise.all([
    getPaymentsByCompany(companyId, filters),
    getPaymentStats(companyId, company.default_currency),
    getAccounts(companyId),
    canManageCompany(supabase, companyId),
    getDebtRemainingByDebtId(companyId),
  ])

  return (
    <PaymentsView
      companyId={companyId}
      company={company}
      payments={payments}
      kpis={stats}
      accounts={accounts}
      canManage={canManage}
      debtRemainingByDebtId={debtRemainingByDebtId}
    />
  )
}
