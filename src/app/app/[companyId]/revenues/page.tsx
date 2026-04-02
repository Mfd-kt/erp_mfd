import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getRevenues, getRevenueClients, getRevenueStats } from '@/modules/revenues/queries'
import { RevenuesView } from '@/modules/revenues/components/RevenuesView'
import type { Company } from '@/lib/supabase/types'

export default async function RevenuesPage({
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

  const status = typeof resolvedSearchParams?.status === 'string' ? resolvedSearchParams.status : undefined
  const create = typeof resolvedSearchParams?.create === 'string' ? resolvedSearchParams.create : undefined
  const expected_date_from = typeof resolvedSearchParams?.expected_date_from === 'string' ? resolvedSearchParams.expected_date_from : undefined
  const expected_date_to = typeof resolvedSearchParams?.expected_date_to === 'string' ? resolvedSearchParams.expected_date_to : undefined
  const source_name = typeof resolvedSearchParams?.source_name === 'string' ? resolvedSearchParams.source_name : undefined
  const client_id = typeof resolvedSearchParams?.client_id === 'string' ? resolvedSearchParams.client_id : undefined
  const revenue_category = typeof resolvedSearchParams?.revenue_category === 'string' ? resolvedSearchParams.revenue_category : undefined
  const filters = { status, expected_date_from, expected_date_to, source_name, client_id, revenue_category }

  const [revenues, revenueClients, stats, canManage] = await Promise.all([
    getRevenues(companyId, filters),
    getRevenueClients(companyId),
    getRevenueStats(companyId, company.default_currency),
    canManageCompany(supabase, companyId),
  ])

  return (
    <RevenuesView
      companyId={companyId}
      company={company}
      revenues={revenues}
      revenueClients={revenueClients}
      canManage={canManage}
      kpis={{
        totalExpected: stats.totalExpected,
        totalReceived: stats.totalReceived,
        expectedThisMonth: stats.expectedThisMonth,
        receivedThisMonth: stats.receivedThisMonth,
      }}
      openCreateOnMount={create === '1'}
    />
  )
}
