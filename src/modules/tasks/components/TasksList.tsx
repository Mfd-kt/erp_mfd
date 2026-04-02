'use client'

import { useMemo, useState } from 'react'
import { TaskRow } from './TaskRow'
import type { TaskWithSprintTitle } from '../queries'
import type { Task } from '../types'
import { TASK_STATUS_LABELS_FR } from '../status-labels'

type SortKey =
  | 'due_date_asc'
  | 'due_date_desc'
  | 'end_date_asc'
  | 'end_date_desc'
  | 'priority_desc'
  | 'status'
  | 'created_desc'
  | 'title_asc'

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

const STATUS_ORDER: Record<Task['status'], number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  cancelled: 3,
}

function compareDue(a: TaskWithSprintTitle, b: TaskWithSprintTitle, asc: boolean): number {
  const ad = a.due_date ? new Date(a.due_date).getTime() : asc ? Infinity : -Infinity
  const bd = b.due_date ? new Date(b.due_date).getTime() : asc ? Infinity : -Infinity
  if (ad !== bd) return asc ? ad - bd : bd - ad
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function compareEnd(a: TaskWithSprintTitle, b: TaskWithSprintTitle, asc: boolean): number {
  const ae = a.end_date ? new Date(a.end_date).getTime() : asc ? Infinity : -Infinity
  const be = b.end_date ? new Date(b.end_date).getTime() : asc ? Infinity : -Infinity
  if (ae !== be) return asc ? ae - be : be - ae
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function sortTasks(tasks: TaskWithSprintTitle[], key: SortKey): TaskWithSprintTitle[] {
  const copy = [...tasks]
  copy.sort((a, b) => {
    switch (key) {
      case 'due_date_asc':
        return compareDue(a, b, true)
      case 'due_date_desc':
        return compareDue(a, b, false)
      case 'end_date_asc':
        return compareEnd(a, b, true)
      case 'end_date_desc':
        return compareEnd(a, b, false)
      case 'priority_desc': {
        const diff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
        if (diff !== 0) return diff
        return compareDue(a, b, true)
      }
      case 'status': {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (diff !== 0) return diff
        return compareDue(a, b, true)
      }
      case 'created_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'title_asc':
        return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
      default:
        return 0
    }
  })
  return copy
}

interface TasksListProps {
  tasks: TaskWithSprintTitle[]
}

export function TasksList({ tasks }: TasksListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('due_date_asc')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false
      if (typeFilter && t.task_type !== typeFilter) return false
      return true
    })
  }, [tasks, statusFilter, typeFilter])

  const sorted = useMemo(() => sortTasks(filtered, sortKey), [filtered, sortKey])

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-zinc-500">Aucune tâche</p>
        <p className="mt-2 max-w-md text-center text-xs text-zinc-600">
          Les nouvelles tâches se créent depuis un sprint : <span className="text-zinc-500">Sprints</span> → ouvrir un
          sprint → <span className="text-zinc-500">Ajouter une tâche</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Trier par</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="due_date_asc">Échéance (plus proche d’abord)</option>
            <option value="due_date_desc">Échéance (plus loin d’abord)</option>
            <option value="end_date_asc">Fin (plus proche d’abord)</option>
            <option value="end_date_desc">Fin (plus loin d’abord)</option>
            <option value="priority_desc">Priorité (plus haute d’abord)</option>
            <option value="status">Statut</option>
            <option value="created_desc">Date de création (récent d’abord)</option>
            <option value="title_asc">Titre (A → Z)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            <option value="todo">{TASK_STATUS_LABELS_FR.todo}</option>
            <option value="in_progress">{TASK_STATUS_LABELS_FR.in_progress}</option>
            <option value="done">{TASK_STATUS_LABELS_FR.done}</option>
            <option value="cancelled">{TASK_STATUS_LABELS_FR.cancelled}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            aria-label="Filtrer par type"
          >
            <option value="">Tous les types</option>
            <option value="important">Important</option>
            <option value="secondary">Secondaire</option>
            <option value="admin">Admin</option>
            <option value="follow_up">Suivi</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((t) => (
          <TaskRow key={t.id} task={t} showSprint={false} sprintTitle={t.sprint_title ?? null} />
        ))}
      </div>

      {sorted.length === 0 && tasks.length > 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">Aucune tâche ne correspond aux filtres.</p>
      )}
    </div>
  )
}
