import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Company } from '@/lib/supabase/types'
import { getAutomationRules } from '@/modules/automation/queries'
import { AutomationRulesView } from '@/modules/automation/components/AutomationRulesView'

export default async function AutomationsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRaw } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!companyRaw) notFound()
  const company = companyRaw as Company

  const rules = await getAutomationRules(supabase, companyId)

  return <AutomationRulesView companyId={companyId} companyName={company.trade_name ?? company.legal_name} rules={rules} />
}
