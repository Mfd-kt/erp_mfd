import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getAccounts } from '@/modules/accounts/queries'
import { AccountsView } from '@/modules/accounts/components/AccountsView'
import type { Company } from '@/lib/supabase/types'

export default async function AccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { companyId } = await params
  const resolvedSearchParams = await searchParams
  const create = typeof resolvedSearchParams?.create === 'string' ? resolvedSearchParams.create : undefined
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

  const [accounts, canManage] = await Promise.all([
    getAccounts(companyId),
    canManageCompany(supabase, companyId),
  ])

  return (
    <AccountsView
      companyId={companyId}
      company={company}
      accounts={accounts}
      canManage={canManage}
      openCreateOnMount={create === '1'}
    />
  )
}
