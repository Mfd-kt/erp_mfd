'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Task } from '../types'
import { updateTaskStatus } from '../actions'
import { TASK_STATUS_BADGE_CLASS, TASK_STATUS_LABELS_FR } from '../status-labels'
import { TaskDetailDialog } from './TaskDetailDialog'
import { formatDateWithWeekdayFr } from '../date-format'
import { Check, FileText, Loader2, Play } from 'lucide-react'

interface TaskRowProps {
  task: Task
  showSprint?: boolean
  /** Libellé du sprint (liste globale des tâches) */
  sprintTitle?: string | null
  reason?: string | null
}

/** Heure PostgreSQL / time → affichage court */
function formatTimeShort(t: string | null | undefined) {
  if (!t) return ''
  const s = t.slice(0, 5)
  return s.replace(':', 'h')
}

const STATUS_COLORS: Record<Task['status'], string> = {
  todo: 'bg-zinc-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
  cancelled: 'bg-zinc-600',
}

export function TaskRow({ task, showSprint = true, sprintTitle, reason }: TaskRowProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  async function handleStatusChange(status: Task['status']) {
    setUpdating(true)
    try {
      await updateTaskStatus(task.id, status)
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      <TaskDetailDialog task={task} open={detailOpen} onOpenChange={setDetailOpen} />

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[task.status]}`}
              title={TASK_STATUS_LABELS_FR[task.status]}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[11px] font-semibold uppercase tracking-wide ${TASK_STATUS_BADGE_CLASS[task.status]}`}
                >
                  {TASK_STATUS_LABELS_FR[task.status]}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-zinc-600 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  onClick={() => setDetailOpen(true)}
                >
                  <FileText size={12} />
                  Détail
                </Button>
              </div>
              <button
                type="button"
                className="block w-full text-left font-medium text-zinc-100 hover:text-white hover:underline"
                onClick={() => setDetailOpen(true)}
              >
                {task.title}
              </button>
              {task.description && (
                <p className="line-clamp-2 text-xs text-zinc-500" title={task.description}>
                  {task.description}
                </p>
              )}
              {(task.status === 'in_progress' || task.status === 'done') && task.next_step_comment && (
                <p className="line-clamp-2 border-l-2 border-amber-500/40 pl-2 text-xs text-zinc-400" title={task.next_step_comment}>
                  {task.next_step_comment}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {task.task_type}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {task.priority}
                </Badge>
                {task.assigned_to_user_id ? (
                  <Badge variant="outline" className="text-[10px]">
                    Assigné: {task.assigned_to_user_id.slice(0, 8)}…
                  </Badge>
                ) : null}
                {(task.due_date || task.due_time) && (
                  <span className="text-xs capitalize text-zinc-500">
                    {task.due_date ? formatDateWithWeekdayFr(task.due_date) : 'Échéance'}
                    {task.due_time ? ` · ${formatTimeShort(task.due_time)}` : null}
                  </span>
                )}
                {(task.end_date || task.end_time) && (
                  <span className="text-xs capitalize text-zinc-400" title="Date/heure de fin">
                    Fin {task.end_date ? formatDateWithWeekdayFr(task.end_date) : ''}
                    {task.end_time
                      ? `${task.end_date ? ' · ' : ''}${formatTimeShort(task.end_time)}`
                      : ''}
                  </span>
                )}
                {sprintTitle && (
                  <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300">
                    Sprint : {sprintTitle}
                  </Badge>
                )}
                {reason && (
                  <span className="text-xs text-zinc-500" title={reason}>
                    {reason}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {task.status !== 'done' && task.status !== 'cancelled' && (
              <>
                {task.status === 'todo' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={updating}
                  >
                    {updating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    Démarrer
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-emerald-400 hover:text-emerald-300"
                  onClick={() => handleStatusChange('done')}
                  disabled={updating}
                >
                  {updating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Terminé
                </Button>
              </>
            )}
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              aria-label="Statut de la tâche"
            >
              <option value="todo">{TASK_STATUS_LABELS_FR.todo}</option>
              <option value="in_progress">{TASK_STATUS_LABELS_FR.in_progress}</option>
              <option value="done">{TASK_STATUS_LABELS_FR.done}</option>
              <option value="cancelled">{TASK_STATUS_LABELS_FR.cancelled}</option>
            </select>
          </div>
        </div>
      </div>
    </>
  )
}
