import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assertGroupAdmin } from '@/lib/auth'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { getErrorLogs } from '@/modules/errors/queries'

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function AdminErrorsPage() {
  const supabase = await createClient()
  try {
    await assertGroupAdmin(supabase)
  } catch {
    redirect('/app')
  }

  const errors = await getErrorLogs(supabase, { limit: 100 })

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Journal des erreurs"
        subtitle="Erreurs enregistrées par les services (DB, API, webhooks, automations)"
      />
      <SectionBlock
        title="Dernières erreurs"
        subtitle="Les erreurs sont loguées automatiquement par withErrorLogging et les services critiques."
      >
        {errors.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
            Aucune erreur enregistrée
          </div>
        ) : (
          <div className="space-y-4">
            {errors.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-zinc-300">
                      {e.service_name}.{e.function_name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-red-400">{e.error_message}</p>
                    {e.metadata && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {JSON.stringify(e.metadata)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">{formatDate(e.created_at)}</span>
                </div>
                {e.stack && (
                  <pre className="mt-3 overflow-x-auto rounded bg-zinc-950 p-3 text-[10px] text-zinc-500">
                    {e.stack}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
