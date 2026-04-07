import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getDebtsWithRemaining } from '@/modules/debts/queries'
import { getCreditors } from '@/modules/creditors/queries'
import { getDebtCategories } from '@/modules/debt-categories/queries'
import { getDebtTypes } from '@/modules/debt-types/queries'
import { DebtsView } from '@/modules/debts/components/DebtsView'
import type { Company } from '@/lib/supabase/types'

export default async function DebtsPage({
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
  const priority = typeof resolvedSearchParams?.priority === 'string' ? resolvedSearchParams.priority : undefined
  const creditor_id = typeof resolvedSearchParams?.creditor_id === 'string' ? resolvedSearchParams.creditor_id : undefined
  const debt_category_id = typeof resolvedSearchParams?.debt_category_id === 'string' ? resolvedSearchParams.debt_category_id : undefined

  const filters =
    status === 'not_overdue'
      ? {
          computed_status_in: ['open', 'partially_paid'],
          priority,
          creditor_id,
          debt_category_id,
        }
      : {
          computed_status:
            status === 'paid' || status === 'cancelled' ? undefined : status,
          priority,
          creditor_id,
          debt_category_id,
        }

  const [debts, creditors, debtCategories, debtTypes, canManage] = await Promise.all([
    getDebtsWithRemaining(companyId, filters),
    getCreditors(companyId),
    getDebtCategories(companyId),
    getDebtTypes(companyId),
    canManageCompany(supabase, companyId),
  ])

  const activeDebts = debts.filter(
    (d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled'
  )

  const openDebts = activeDebts
  const totalOpen = openDebts.reduce((s, d) => s + Number(d.remaining_company_currency), 0)
  const totalOverdue = openDebts
    .filter((d) => d.computed_status === 'overdue')
    .reduce((s, d) => s + Number(d.remaining_company_currency), 0)

  return (
    <DebtsView
      companyId={companyId}
      company={company}
      debts={activeDebts}
      creditors={creditors}
      debtCategories={debtCategories}
      debtTypes={debtTypes}
      canManage={canManage}
      kpis={{
        totalOpen,
        totalOverdue,
        openCount: openDebts.length,
        criticalCount: openDebts.filter((d) => d.priority === 'critical').length,
      }}
      openCreateOnMount={create === '1'}
      filterCreditorId={creditor_id}
    />
  )
}
