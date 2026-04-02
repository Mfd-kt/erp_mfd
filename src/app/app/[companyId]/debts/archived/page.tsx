import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getDebtsWithRemaining } from '@/modules/debts/queries'
import { getCreditors } from '@/modules/creditors/queries'
import { getDebtCategories } from '@/modules/debt-categories/queries'
import { DebtsView } from '@/modules/debts/components/DebtsView'
import type { Company } from '@/lib/supabase/types'

export default async function ArchivedDebtsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { companyId } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (!companyRow) notFound()
  const company = companyRow as Company

  const status = typeof resolvedSearchParams?.status === 'string' ? resolvedSearchParams.status : undefined
  const priority = typeof resolvedSearchParams?.priority === 'string' ? resolvedSearchParams.priority : undefined
  const creditor_id =
    typeof resolvedSearchParams?.creditor_id === 'string' ? resolvedSearchParams.creditor_id : undefined
  const debt_category_id =
    typeof resolvedSearchParams?.debt_category_id === 'string' ? resolvedSearchParams.debt_category_id : undefined
  const normalizedStatus =
    status === 'paid' || status === 'cancelled' ? status : undefined
  const filters = {
    computed_status: normalizedStatus,
    priority,
    creditor_id,
    debt_category_id,
  }

  const [debts, creditors, debtCategories] = await Promise.all([
    getDebtsWithRemaining(companyId, filters),
    getCreditors(companyId),
    getDebtCategories(companyId),
  ])

  const archivedDebts = debts.filter(
    (d) => d.computed_status === 'paid' || d.computed_status === 'cancelled'
  )
  const totalArchived = archivedDebts.reduce((s, d) => s + Number(d.amount_company_currency), 0)
  const cancelledAmount = archivedDebts
    .filter((d) => d.computed_status === 'cancelled')
    .reduce((s, d) => s + Number(d.amount_company_currency), 0)
  const paidCount = archivedDebts.filter((d) => d.computed_status === 'paid').length
  const cancelledCount = archivedDebts.filter((d) => d.computed_status === 'cancelled').length

  return (
    <DebtsView
      companyId={companyId}
      company={company}
      debts={archivedDebts}
      creditors={creditors}
      debtCategories={debtCategories}
      debtTypes={[]}
      canManage={false}
      statusMode="archived"
      title="Dettes archivées"
      subtitle={`${company.trade_name ?? company.legal_name} · Historique des dettes payées et annulées.`}
      kpis={{
        totalOpen: totalArchived,
        totalOverdue: cancelledAmount,
        openCount: paidCount,
        criticalCount: cancelledCount,
      }}
      kpiLabels={{
        totalOpen: 'Total archivé',
        totalOverdue: 'Montant annulé',
        openCount: 'Payées',
        criticalCount: 'Annulées (nb)',
      }}
      openCreateOnMount={false}
    />
  )
}
