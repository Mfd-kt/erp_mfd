import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getRevenueById, getRevenueClients } from '@/modules/revenues/queries'
import { getAccounts } from '@/modules/accounts/queries'
import { RevenueDetailView } from '@/modules/revenues/components/RevenueDetailView'
import type { Company } from '@/lib/supabase/types'

export default async function RevenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; revenueId: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { companyId, revenueId } = await params
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

  const [revenue, revenueClients, accounts, canManage] = await Promise.all([
    getRevenueById(companyId, revenueId),
    getRevenueClients(companyId),
    getAccounts(companyId),
    canManageCompany(supabase, companyId),
  ])

  if (!revenue) notFound()

  return (
    <RevenueDetailView
      companyId={companyId}
      company={company}
      revenue={revenue}
      revenueClients={revenueClients}
      accounts={accounts}
      canManage={canManage}
      initialOpenReceive={sp.action === 'receive'}
    />
  )
}
