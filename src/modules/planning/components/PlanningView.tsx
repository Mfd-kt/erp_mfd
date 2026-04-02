'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { regenerateDailyPlan, saveDailyPlan } from '../actions'
import type { DailyPlanWithTasks } from '../queries'
import type { Task } from '@/modules/tasks/types'
import { TASK_STATUS_BADGE_CLASS, TASK_STATUS_LABELS_FR } from '@/modules/tasks/status-labels'
import { formatDateWithWeekdayFr } from '@/modules/tasks/date-format'
import { RefreshCw, Target, List, Check, Loader2 } from 'lucide-react'

interface PlanningViewProps {
  plan: DailyPlanWithTasks | null
  planDate: string
}

function formatTimeShort(t: string | null | undefined) {
  if (!t) return ''
  return t.slice(0, 5).replace(':', 'h')
}

/** Ligne « Fin … » pour date et/ou heure de fin */
function formatFinLine(task: Task): string | null {
  if (!task.end_date && !task.end_time) return null
  const parts: string[] = []
  if (task.end_date) parts.push(formatDateWithWeekdayFr(task.end_date))
  if (task.end_time) parts.push(formatTimeShort(task.end_time))
  return parts.length ? `Fin ${parts.join(' · ')}` : null
}

function TaskCard({
  task,
  label,
  variant,
  reason,
}: {
  task: Task | null
  label: string
  variant: 'primary' | 'secondary'
  reason?: string | null
}) {
  if (!task) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6">
        <p className="text-sm text-zinc-500">{label} — Aucune tâche</p>
      </div>
    )
  }

  const isDone = task.status === 'done'
  const finLine = formatFinLine(task)

  return (
    <div
      className={`rounded-xl border p-6 transition-opacity ${
        variant === 'primary'
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-zinc-700 bg-zinc-900/50'
      } ${isDone ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <h3 className="mt-1 font-medium text-zinc-100">{task.title}</h3>
          {reason && (
            <p className="mt-1 text-xs text-zinc-500" title={reason}>
              {reason}
            </p>
          )}
          {task.due_date && !reason && (
            <p className="mt-1 text-xs capitalize text-zinc-500">
              Échéance: {formatDateWithWeekdayFr(task.due_date)}
              {task.due_time ? ` · ${formatTimeShort(task.due_time)}` : ''}
              {finLine ? ` · ${finLine}` : ''}
            </p>
          )}
          {!task.due_date && finLine && !reason && (
            <p className="mt-1 text-xs text-zinc-400">{finLine}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${TASK_STATUS_BADGE_CLASS[task.status]}`}
          >
            {task.status === 'done' && <Check size={10} className="inline mr-0.5" />}
            {TASK_STATUS_LABELS_FR[task.status]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {task.priority}
          </Badge>
        </div>
      </div>
      {(task.status === 'in_progress' || task.status === 'done') && task.next_step_comment && (
        <p className="mt-3 border-l-2 border-amber-500/40 pl-3 text-xs leading-relaxed text-zinc-400">
          {task.next_step_comment}
        </p>
      )}
    </div>
  )
}

export function PlanningView({ plan, planDate }: PlanningViewProps) {
  const router = useRouter()
  const [regenerating, setRegenerating] = useState(false)
  const [keepPrimary, setKeepPrimary] = useState(true)
  const [notes, setNotes] = useState(plan?.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)

  const tasks = [
    plan?.primary_task,
    plan?.secondary_task_1,
    plan?.secondary_task_2,
  ].filter(Boolean) as Task[]
  const completedCount = tasks.filter((t) => t.status === 'done').length

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateDailyPlan(planDate, { keepPrimary })
      router.refresh()
    } finally {
      setRegenerating(false)
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true)
    try {
      await saveDailyPlan(planDate, { notes: notes || null })
      router.refresh()
    } finally {
      setNotesSaving(false)
    }
  }

  return (
    <div className="space-y-8">
        {/* Progress + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-300">
              {completedCount}/3 tâches terminées
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={keepPrimary}
                onChange={(e) => setKeepPrimary(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Garder la tâche principale
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Recalculer le plan
            </Button>
          </div>
        </div>

        {/* Main task - large card */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Target size={16} />
            Tâche principale
          </h2>
          <TaskCard
            task={plan?.primary_task ?? null}
            label="1 tâche importante"
            variant="primary"
            reason={plan?.plan_metadata?.primary}
          />
        </div>

        {/* Secondary tasks - smaller cards */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-400">
            <List size={16} />
            Tâches secondaires
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TaskCard
              task={plan?.secondary_task_1 ?? null}
              label="Tâche 2"
              variant="secondary"
              reason={plan?.plan_metadata?.secondary1}
            />
            <TaskCard
              task={plan?.secondary_task_2 ?? null}
              label="Tâche 3"
              variant="secondary"
              reason={plan?.plan_metadata?.secondary2}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Notes du jour (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Ajoutez des notes pour aujourd'hui..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[80px]"
          />
          {notesSaving && (
            <p className="mt-1 text-xs text-zinc-500">Enregistrement...</p>
          )}
        </div>

        {!plan?.primary_task && !plan?.secondary_task_1 && !plan?.secondary_task_2 && (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center text-sm text-zinc-500">
            Aucun plan pour aujourd&apos;hui. Cliquez sur &quot;Recalculer le plan&quot; pour générer une suggestion.
          </p>
        )}
      </div>
  )
}
