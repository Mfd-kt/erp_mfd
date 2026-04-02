import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Company } from '@/lib/supabase/types'
import { getActivityLogs } from '@/modules/activity/service'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { formatActivityMetadata } from '@/modules/activity/formatters/metadata'

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

const ACTION_LABELS: Record<string, string> = {
  debt_created: 'Dette créée',
  debt_updated: 'Dette modifiée',
  payment_created: 'Paiement créé',
  payment_updated: 'Paiement modifié',
  revenue_created: 'Revenu créé',
  revenue_updated: 'Revenu modifié',
  revenue_received: 'Revenu encaissé',
  task_auto_completed: 'Tâche auto-complétée',
}
const ENTITY_LABELS: Record<string, string> = {
  debt: 'Dette',
  revenue: 'Revenu',
  payment: 'Paiement',
  task: 'Tâche',
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ action_type?: string; entity_type?: string }>
}) {
  const { companyId } = await params
  const sp = await searchParams
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

  const logs = await getActivityLogs(supabase, companyId, {
    actionType: sp.action_type,
    entityType: sp.entity_type,
  })

  function entityHref(log: any) {
    if (!log.entity_id) return null
    if (log.entity_type === 'debt') return `/app/${companyId}/debts/${log.entity_id}`
    if (log.entity_type === 'revenue') return `/app/${companyId}/revenues/${log.entity_id}`
    if (log.entity_type === 'payment' && log.metadata && typeof log.metadata.debt_id === 'string') {
      return `/app/${companyId}/debts/${log.metadata.debt_id}`
    }
    return null
  }

  return (
    <div className="space-y-8 fade-in">
      <HeroPageHeader
        title="Activité"
        subtitle={`${company.trade_name ?? company.legal_name} · Historique auditable des opérations et automatisations.`}
        explain={KPI_EXPLAIN.pageActivity()}
      />
      <SectionBlock
        title="Timeline"
        subtitle="Créations, mises à jour, paiements, encaissements et automatisations."
        explain={KPI_EXPLAIN.activityLog()}
      >
        <form className="mb-4 flex flex-wrap items-center gap-3">
          <select name="action_type" defaultValue={sp.action_type ?? ''} className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200">
            <option value="">Toutes les actions</option>
            <option value="debt_created">Dette créée</option>
            <option value="debt_updated">Dette modifiée</option>
            <option value="payment_created">Paiement créé</option>
            <option value="payment_updated">Paiement modifié</option>
            <option value="revenue_created">Revenu créé</option>
            <option value="revenue_updated">Revenu modifié</option>
            <option value="revenue_received">Revenu encaissé</option>
            <option value="task_auto_completed">Tâche auto-complétée</option>
          </select>
          <select name="entity_type" defaultValue={sp.entity_type ?? ''} className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200">
            <option value="">Toutes les entités</option>
            <option value="debt">Dette</option>
            <option value="revenue">Revenu</option>
            <option value="payment">Paiement</option>
            <option value="task">Tâche</option>
          </select>
          <button type="submit" className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300 transition-colors hover:bg-zinc-800">Filtrer</button>
          <Link href={`/app/${companyId}/activity`} className="text-sm text-zinc-500 hover:text-zinc-200">Réinitialiser</Link>
        </form>
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune activité enregistrée.</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log: any) => (
              <div key={log.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{ACTION_LABELS[log.action_type] ?? log.action_type}</p>
                    {entityHref(log) ? (
                      <Link href={entityHref(log)!} className="mt-1 inline-block text-xs text-blue-400 hover:text-blue-300">
                        {ENTITY_LABELS[log.entity_type] ?? log.entity_type} {log.entity_id ?? ''}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">{ENTITY_LABELS[log.entity_type] ?? log.entity_type} {log.entity_id ?? ''}</p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{formatDate(log.created_at)}</span>
                </div>
                {log.metadata ? <p className="mt-3 text-xs text-zinc-400">{formatActivityMetadata(log.metadata as Record<string, unknown>, log.action_type)}</p> : null}
              </div>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
