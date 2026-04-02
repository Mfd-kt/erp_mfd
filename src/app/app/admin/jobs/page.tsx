import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assertGroupAdmin } from '@/lib/auth'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { getJobRuns } from '@/modules/jobs/queries'
import { Badge } from '@/components/ui/badge'

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function AdminJobsPage() {
  const supabase = await createClient()
  try {
    await assertGroupAdmin(supabase)
  } catch {
    redirect('/app')
  }

  const runs = await getJobRuns(supabase, { limit: 50 })

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Exécutions des jobs"
        subtitle="Historique des tâches planifiées (récurrences, retry webhooks)"
      />
      <SectionBlock
        title="Historique"
        subtitle="Dernières exécutions. Les jobs sont déclenchés via GET /api/cron/jobs?job=all (protégé par CRON_SECRET)."
      >
        {runs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
            Aucune exécution enregistrée
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Job
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Statut
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Début
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Fin
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Résultat / Erreur
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {runs.map((r) => (
                  <tr key={r.id} className="interactive-row">
                    <td className="px-4 py-4 font-mono text-zinc-300">{r.job_name}</td>
                    <td className="px-4 py-4">
                      {r.status === 'success' ? (
                        <Badge variant="outline" className="border-emerald-600/40 text-emerald-400">Succès</Badge>
                      ) : r.status === 'failed' ? (
                        <Badge variant="destructive">Échec</Badge>
                      ) : (
                        <Badge variant="secondary">En cours</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{formatDate(r.started_at)}</td>
                    <td className="px-4 py-4 text-zinc-400">{r.completed_at ? formatDate(r.completed_at) : '—'}</td>
                    <td className="px-4 py-4 text-zinc-400 max-w-xs truncate">
                      {r.error_message ?? (r.result_json ? JSON.stringify(r.result_json) : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
