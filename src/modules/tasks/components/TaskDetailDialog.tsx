'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Task } from '../types'
import { getAssignableMembers, updateTask } from '../actions'
import { TASK_STATUS_LABELS_FR } from '../status-labels'
import { formatDateTimeWithWeekdayFr, formatDateWithWeekdayFr } from '../date-format'
import { Loader2 } from 'lucide-react'

function timeForInput(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function normalizeTime(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  return t.length === 5 ? `${t}:00` : t
}

type FormState = {
  title: string
  description: string
  next_step_comment: string
  assigned_to_user_id: string
  task_type: Task['task_type']
  status: Task['status']
  priority: Task['priority']
  due_date: string
  due_time: string
  end_date: string
  end_time: string
  estimated_minutes: string
  energy_level: Task['energy_level']
}

function buildFormFromTask(t: Task): FormState {
  return {
    title: t.title,
    description: t.description ?? '',
    next_step_comment: t.next_step_comment ?? '',
    assigned_to_user_id: t.assigned_to_user_id ?? '',
    task_type: t.task_type,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date ?? '',
    due_time: timeForInput(t.due_time),
    end_date: t.end_date ?? '',
    end_time: timeForInput(t.end_time),
    estimated_minutes: t.estimated_minutes != null ? String(t.estimated_minutes) : '',
    energy_level: t.energy_level,
  }
}

interface TaskDetailDialogProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => buildFormFromTask(task))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignees, setAssignees] = useState<Array<{ user_id: string; label: string }>>([])

  useEffect(() => {
    if (open) {
      setForm(buildFormFromTask(task))
      setError(null)
    }
  }, [open, task])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!open || !task.company_id) {
        setAssignees([])
        return
      }
      try {
        const rows = await getAssignableMembers(task.company_id)
        if (!cancelled) setAssignees(rows)
      } catch {
        if (!cancelled) setAssignees([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, task.company_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const est = form.estimated_minutes.trim()
      let estimated_minutes: number | null = null
      if (est !== '') {
        const n = parseInt(est, 10)
        if (Number.isNaN(n) || n < 1) {
          setError('Durée estimée : entier positif ou laisser vide.')
          setSaving(false)
          return
        }
        estimated_minutes = n
      }
      await updateTask({
        id: task.id,
        company_id: task.company_id,
        assigned_to_user_id: form.assigned_to_user_id.trim() === '' ? null : form.assigned_to_user_id,
        sprint_id: task.sprint_id,
        scope_type: task.scope_type,
        title: form.title.trim(),
        description: form.description.trim() === '' ? null : form.description.trim(),
        next_step_comment: form.next_step_comment.trim() === '' ? null : form.next_step_comment.trim(),
        task_type: form.task_type,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date.trim() === '' ? null : form.due_date,
        due_time: normalizeTime(form.due_time),
        end_date: form.end_date.trim() === '' ? null : form.end_date,
        end_time: normalizeTime(form.end_time),
        estimated_minutes,
        energy_level: form.energy_level,
        linked_entity_type: task.linked_entity_type,
        linked_entity_id: task.linked_entity_id,
      })
      router.refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] flex flex-col border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <DialogHeader className="shrink-0 border-b border-zinc-800 px-4 py-3">
            <DialogTitle className="text-lg text-zinc-50">Tâche — détail & modification</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Descriptif, commentaire d’étape, dates et statut. Enregistrez pour appliquer les changements.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Titre *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={fieldClass}
                maxLength={500}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Descriptif</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${fieldClass} min-h-[88px] resize-y`}
                rows={4}
                maxLength={2000}
                placeholder="Contexte, objectifs, notes…"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Étape suivante / commentaire</label>
              <textarea
                value={form.next_step_comment}
                onChange={(e) => setForm((f) => ({ ...f, next_step_comment: e.target.value }))}
                className={`${fieldClass} min-h-[72px] resize-y`}
                rows={3}
                maxLength={2000}
                placeholder="Suite à prévoir, relance, transfert…"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Affecter à (équipe)</label>
              <select
                value={form.assigned_to_user_id}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to_user_id: e.target.value }))}
                className={fieldClass}
                disabled={!task.company_id || assignees.length === 0}
              >
                <option value="">
                  {!task.company_id
                    ? 'Pas d’entreprise liée'
                    : assignees.length === 0
                      ? 'Aucun membre trouvé'
                      : '— Non assigné —'}
                </option>
                {assignees.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Statut</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task['status'] }))}
                  className={fieldClass}
                >
                  <option value="todo">{TASK_STATUS_LABELS_FR.todo}</option>
                  <option value="in_progress">{TASK_STATUS_LABELS_FR.in_progress}</option>
                  <option value="done">{TASK_STATUS_LABELS_FR.done}</option>
                  <option value="cancelled">{TASK_STATUS_LABELS_FR.cancelled}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Priorité</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Task['priority'] }))}
                  className={fieldClass}
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Type</label>
                <select
                  value={form.task_type}
                  onChange={(e) => setForm((f) => ({ ...f, task_type: e.target.value as Task['task_type'] }))}
                  className={fieldClass}
                >
                  <option value="important">Important</option>
                  <option value="secondary">Secondaire</option>
                  <option value="admin">Admin</option>
                  <option value="follow_up">Suivi</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Énergie</label>
                <select
                  value={form.energy_level}
                  onChange={(e) => setForm((f) => ({ ...f, energy_level: e.target.value as Task['energy_level'] }))}
                  className={fieldClass}
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Élevée</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Échéance (date)</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={fieldClass}
                />
                {form.due_date ? (
                  <p className="mt-1 text-xs capitalize text-zinc-500">
                    {formatDateWithWeekdayFr(form.due_date, { month: 'long' })}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Heure d’échéance</label>
                <input
                  type="time"
                  value={form.due_time}
                  onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Date de fin</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className={fieldClass}
                />
                {form.end_date ? (
                  <p className="mt-1 text-xs capitalize text-zinc-500">
                    {formatDateWithWeekdayFr(form.end_date, { month: 'long' })}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Heure de fin</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Durée estimée (minutes)</label>
              <input
                type="number"
                min={1}
                value={form.estimated_minutes}
                onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: e.target.value }))}
                className={fieldClass}
                placeholder="Optionnel"
              />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-500">
              <p className="capitalize">
                Création : {formatDateTimeWithWeekdayFr(task.created_at)}
              </p>
              {task.completed_at && (
                <p className="mt-1 capitalize">
                  Terminé le : {formatDateTimeWithWeekdayFr(task.completed_at)}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Fermer
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
