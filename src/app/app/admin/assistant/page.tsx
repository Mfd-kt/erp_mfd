import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assertGroupAdmin } from '@/lib/auth'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import {
  getRecentRuns,
  getRecentToolCalls,
} from '@/modules/assistant/queries'
import { getPendingActions } from '@/modules/assistant/confirmations'

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function AdminAssistantPage() {
  const supabase = await createClient()
  try {
    await assertGroupAdmin(supabase)
  } catch {
    redirect('/app')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [runs, toolCalls, failedToolCalls, pendingActions] = await Promise.all([
    getRecentRuns(supabase, user.id, 20),
    getRecentToolCalls(supabase, user.id, { limit: 30 }),
    getRecentToolCalls(supabase, user.id, { status: 'failed', limit: 20 }),
    getPendingActions(supabase, user.id, 'pending'),
  ])
  const failedRuns = runs.filter((r) => r.status === 'failed')

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Assistant (debug)"
        subtitle="Runs, tool calls et actions en attente"
      />

      <SectionBlock title="Actions en attente" subtitle="Confirmations requises.">
        {pendingActions.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune.</p>
        ) : (
          <div className="space-y-2">
            {pendingActions.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2"
              >
                <p className="font-mono text-sm text-amber-200">{a.action_name}</p>
                <pre className="mt-1 text-xs text-zinc-500 overflow-x-auto">
                  {JSON.stringify(a.action_payload_json)}
                </pre>
                <span className="text-xs text-zinc-500">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Runs récents" subtitle="Derniers assistant_runs.">
        {runs.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun run.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border px-3 py-2 ${
                  r.status === 'failed'
                    ? 'border-red-800/50 bg-red-950/20'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-zinc-300">
                      {r.trigger_type} · {r.status}
                    </p>
                    {r.summary && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{r.summary}</p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">{formatDate(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Tool calls récents" subtitle="Derniers assistant_tool_calls.">
        {toolCalls.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun.</p>
        ) : (
          <div className="space-y-2">
            {toolCalls.map((tc) => (
              <div
                key={tc.id}
                className={`rounded-lg border px-3 py-2 ${
                  tc.status === 'failed'
                    ? 'border-red-800/50 bg-red-950/20'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-zinc-300">
                      {tc.tool_name} · {tc.status}
                    </p>
                    {tc.error_message && (
                      <p className="mt-1 text-xs text-red-400">{tc.error_message}</p>
                    )}
                    <pre className="mt-1 max-h-16 overflow-auto text-[10px] text-zinc-500">
                      {JSON.stringify(tc.tool_arguments_json)}
                    </pre>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">{formatDate(tc.started_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Runs en échec" subtitle="assistant_runs avec status failed.">
        {failedRuns.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun.</p>
        ) : (
          <div className="space-y-2">
            {failedRuns.map((r) => (
              <div key={r.id} className="rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-2">
                <p className="font-mono text-sm text-red-200">{r.trigger_type}</p>
                <p className="text-xs text-zinc-500">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Tool calls en échec" subtitle="assistant_tool_calls avec status failed.">
        {failedToolCalls.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun.</p>
        ) : (
          <div className="space-y-2">
            {failedToolCalls.map((tc) => (
              <div key={tc.id} className="rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-2">
                <p className="font-mono text-sm text-red-200">{tc.tool_name}</p>
                {tc.error_message && (
                  <p className="mt-1 text-xs text-red-300">{tc.error_message}</p>
                )}
                <p className="text-xs text-zinc-500">{formatDate(tc.started_at)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
