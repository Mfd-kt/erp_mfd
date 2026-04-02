import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { computeGroupAlerts } from '@/modules/alerts/service'
import { AlertsSummary } from '@/modules/alerts/components/AlertsSummary'
import { AlertsList } from '@/modules/alerts/components/AlertsList'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'

export default async function GroupAlertsPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.group) redirect('/app')

  const supabase = await createClient()
  const analytics = await computeGroupAlerts(
    supabase,
    scope.group.id,
    scope.companies,
    scope.group.base_currency
  )

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Alertes groupe"
        subtitle={`${scope.group.name} · Consolidation en ${scope.group.base_currency}`}
      />

      <AlertsSummary
        critical={analytics.critical}
        warnings={analytics.warnings}
        infos={analytics.infos}
      />

      <SectionBlock title="Flux d'alertes" subtitle="Risques consolidés et alertes de fiabilité groupe.">
        <AlertsList alerts={analytics.alerts} />
      </SectionBlock>
    </div>
  )
}
