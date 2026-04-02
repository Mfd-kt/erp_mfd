import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getAccounts, getAccountWithBalanceById } from '@/modules/accounts/queries'
import { getPaymentsByAccount } from '@/modules/payments/queries'
import {
  getRevenueClients,
  getRevenueInflowsForAccount,
  getReceivableRevenues,
} from '@/modules/revenues/queries'
import { getDebtsWithRemaining } from '@/modules/debts/queries'
import { AccountDetailView } from '@/modules/accounts/components/AccountDetailView'
import type { Company } from '@/lib/supabase/types'

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; accountId: string }>
}) {
  const { companyId, accountId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRow } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!companyRow) notFound()
  const company = companyRow as Company

  const [account, canManage, payments, revenueInflows, openDebts, receivableRevenues, revenueClients, allAccounts] = await Promise.all([
    getAccountWithBalanceById(companyId, accountId),
    canManageCompany(supabase, companyId),
    getPaymentsByAccount(companyId, accountId),
    getRevenueInflowsForAccount(companyId, accountId),
    getDebtsWithRemaining(companyId),
    getReceivableRevenues(companyId),
    getRevenueClients(companyId),
    getAccounts(companyId),
  ])

  if (!account) notFound()

  return (
    <AccountDetailView
      companyId={companyId}
      company={company}
      account={account}
      payments={payments}
      revenueInflows={revenueInflows}
      openDebts={openDebts}
      receivableRevenues={receivableRevenues}
      revenueClients={revenueClients}
      allAccounts={allAccounts}
      canManage={canManage}
    />
  )
}
