'use client'

import Link from 'next/link'
import type { AssistantConversation, AssistantRecommendation } from '@/modules/assistant/types'

interface GroupCopilotSectionProps {
  recommendations: AssistantRecommendation[]
  latestConversation: AssistantConversation | null
}

function severityLabel(s: AssistantRecommendation['severity']) {
  if (s === 'critical') return 'Critique'
  if (s === 'warning') return 'Avertissement'
  return 'Info'
}

function severityClass(s: AssistantRecommendation['severity']) {
  if (s === 'critical') return 'text-red-300'
  if (s === 'warning') return 'text-amber-300'
  return 'text-sky-300'
}

export function GroupCopilotSection({ recommendations, latestConversation }: GroupCopilotSectionProps) {
  return (
    <div className="space-y-3">
      {latestConversation ? (
        <Link
          href={`/app/assistant/${latestConversation.id}`}
          className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 hover:border-zinc-700"
        >
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Dernière conversation</p>
          <p className="mt-1 truncate text-sm font-medium text-zinc-100">{latestConversation.title}</p>
        </Link>
      ) : null}

      {recommendations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-sm text-zinc-500">
          Aucune recommandation ouverte.
        </p>
      ) : (
        recommendations.map((r) => (
          <Link
            key={r.id}
            href="/app/assistant/recommendations"
            className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 hover:border-zinc-700"
          >
            <p className="text-sm font-medium text-zinc-100">{r.title}</p>
            {r.body ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{r.body}</p> : null}
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className={`text-[11px] font-medium uppercase tracking-wide ${severityClass(r.severity)}`}>
                {severityLabel(r.severity)}
              </p>
              <span className="text-[10px] text-zinc-600">Action suggérée</span>
            </div>
          </Link>
        ))
      )}

      <Link href="/app/assistant" className="inline-block text-xs text-amber-400 hover:text-amber-300">
        Ouvrir le copilote →
      </Link>
    </div>
  )
}
