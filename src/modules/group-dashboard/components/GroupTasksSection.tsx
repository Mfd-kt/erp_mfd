'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { TASK_STATUS_LABELS_FR } from '@/modules/tasks/status-labels'
import type { GroupExecutionTasksDigest } from '../types'
import { formatDateWithWeekdayFr } from '@/modules/tasks/date-format'

interface GroupTasksSectionProps {
  digest: GroupExecutionTasksDigest
}

function formatTimeShort(t: string | null | undefined) {
  if (!t) return ''
  return t.slice(0, 5).replace(':', 'h')
}

export function GroupTasksSection({ digest }: GroupTasksSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Backlog ouvert</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{digest.counts.open}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{TASK_STATUS_LABELS_FR.todo}</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{digest.counts.todo}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{TASK_STATUS_LABELS_FR.in_progress}</p>
          <p className="mt-1 text-lg font-semibold text-amber-300">{digest.counts.in_progress}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{TASK_STATUS_LABELS_FR.done}</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">{digest.counts.done}</p>
        </div>
      </div>

      <div className="space-y-2">
        {digest.upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-sm text-zinc-500">Aucune tâche récente.</p>
        ) : (
          digest.upcoming.map((task) => (
            <Link
              key={task.id}
              href="/app/tasks"
              className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{task.title}</p>
                  <p className="mt-1 text-xs capitalize text-zinc-500">
                    {task.due_date ? formatDateWithWeekdayFr(task.due_date) : 'Sans échéance'}
                    {task.due_time ? ` · ${formatTimeShort(task.due_time)}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {TASK_STATUS_LABELS_FR[task.status]}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                {task.sprint_title ? <span>Sprint : {task.sprint_title}</span> : null}
                <Badge variant="outline" className="h-4 text-[10px] text-zinc-400">
                  {task.company_id ? 'Entité' : 'Globale'}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </div>
      <p className="text-[11px] text-zinc-600">Indicateurs consolidés groupe · tâches annulées exclues.</p>
    </div>
  )
}
