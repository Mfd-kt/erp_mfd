import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getDebtTypes } from '@/modules/debt-types/queries'
import { DebtTypesView } from '@/modules/debt-types/components/DebtTypesView'
import type { Company } from '@/lib/supabase/types'

export default async function DebtTypesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
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

  const [debtTypes, canManage] = await Promise.all([
    getDebtTypes(companyId),
    canManageCompany(supabase, companyId),
  ])

  return (
    <DebtTypesView
      companyId={companyId}
      company={company}
      debtTypes={debtTypes}
      canManage={canManage}
    />
  )
}
