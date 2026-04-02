import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { canManageCompany } from '@/lib/auth'
import { getCreditors } from '@/modules/creditors/queries'
import { CreditorsView } from '@/modules/creditors/components/CreditorsView'
import type { Company } from '@/lib/supabase/types'

export default async function CreditorsPage({ params }: { params: Promise<{ companyId: string }> }) {
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

  const [creditors, canManage] = await Promise.all([
    getCreditors(companyId),
    canManageCompany(supabase, companyId),
  ])

  return (
    <CreditorsView
      companyId={companyId}
      company={company}
      creditors={creditors}
      canManage={canManage}
    />
  )
}
