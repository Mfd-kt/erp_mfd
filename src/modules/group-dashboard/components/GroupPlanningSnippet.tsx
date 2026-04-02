'use client'

import Link from 'next/link'
import type { DailyPlanWithTasks } from '@/modules/planning/queries'

interface GroupPlanningSnippetProps {
  planDate: string
  plan: DailyPlanWithTasks | null
}

export function GroupPlanningSnippet({ planDate, plan }: GroupPlanningSnippetProps) {
  const dateLabel = new Date(`${planDate}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Cadence du jour</p>
      <p className="mt-1 text-xs capitalize text-zinc-500">{dateLabel}</p>
      {!plan ? (
        <p className="mt-2 text-sm text-zinc-400">Aucun plan défini.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-200">
          <li>
            <span className="text-zinc-500">Prioritaire:</span> {plan.primary_task?.title ?? '—'}
          </li>
          <li>
            <span className="text-zinc-500">Secondaire 1:</span> {plan.secondary_task_1?.title ?? '—'}
          </li>
          <li>
            <span className="text-zinc-500">Secondaire 2:</span> {plan.secondary_task_2?.title ?? '—'}
          </li>
        </ul>
      )}
      <Link href="/app/planning" className="mt-3 inline-block text-xs text-amber-400 hover:text-amber-300">
        Ouvrir le planning →
      </Link>
    </div>
  )
}
