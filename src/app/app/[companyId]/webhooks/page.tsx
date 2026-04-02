import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Company } from '@/lib/supabase/types'
import { getWebhooks } from '@/modules/integrations/webhooks/queries'
import { WebhooksView } from '@/modules/integrations/webhooks/components/WebhooksView'

export default async function WebhooksPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRaw } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!companyRaw) notFound()
  const company = companyRaw as Company

  const webhooks = await getWebhooks(supabase, companyId)

  return <WebhooksView companyId={companyId} companyName={company.trade_name ?? company.legal_name} webhooks={webhooks} />
}
