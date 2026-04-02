import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { computeCompanyAlerts } from '@/modules/alerts/service'
import { AlertsSummary } from '@/modules/alerts/components/AlertsSummary'
import { AlertsList } from '@/modules/alerts/components/AlertsList'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import type { Company } from '@/lib/supabase/types'

export default async function CompanyAlertsPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRaw } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!companyRaw) notFound()
  const company = companyRaw as Company

  const result = await computeCompanyAlerts(supabase, companyId)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Alertes"
        subtitle={`${company.trade_name ?? company.legal_name} · ${company.default_currency}`}
        explain={KPI_EXPLAIN.pageAlerts()}
      />

      <AlertsSummary
        critical={result.critical}
        warnings={result.warnings}
        infos={result.infos}
        explains={{
          critical: KPI_EXPLAIN.alertsCritical(),
          warnings: KPI_EXPLAIN.alertsWarnings(),
          infos: KPI_EXPLAIN.alertsInfos(),
        }}
      />

      <SectionBlock title="Flux d'alertes" subtitle="Actions et signaux financiers à traiter.">
        <AlertsList alerts={result.alerts} companyId={companyId} />
      </SectionBlock>
    </div>
  )
}
