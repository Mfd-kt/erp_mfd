'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import type { Company } from '@/lib/supabase/types'
import type { Sprint } from '@/modules/sprints/types'
import { createTask, getAssignableMembers } from '../actions'

const SCOPE_LABELS: Record<Sprint['scope_type'], string> = {
  global: 'Global',
  business: 'Professionnel',
  personal: 'Personnel',
}

interface TaskFormProps {
  companies: Company[]
  sprints: Sprint[]
  /** Si défini : sprint imposé (pas de sélecteur). Utilisé depuis la page d’un sprint. */
  fixedSprintId?: string
  /** Après création, redirection (défaut : /app/tasks). */
  redirectAfterCreate?: string
}

export function TaskForm({ companies, sprints, fixedSprintId, redirectAfterCreate = '/app/tasks' }: TaskFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [assignees, setAssignees] = useState<Array<{ user_id: string; label: string }>>([])

  const sprintFromContext = useMemo(
    () => (fixedSprintId ? sprints.find((s) => s.id === fixedSprintId) : undefined),
    [fixedSprintId, sprints],
  )
  const companyIdForAssignment = sprintFromContext?.company_id ?? (selectedCompanyId || null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!companyIdForAssignment) {
        setAssignees([])
        return
      }
      try {
        const rows = await getAssignableMembers(companyIdForAssignment)
        if (!cancelled) setAssignees(rows)
      } catch {
        if (!cancelled) setAssignees([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [companyIdForAssignment])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    try {
      const companyId = sprintFromContext
        ? sprintFromContext.company_id
        : ((fd.get('company_id') as string) || null)
      const scopeType = sprintFromContext
        ? sprintFromContext.scope_type
        : ((fd.get('scope_type') as 'business' | 'personal' | 'global') || 'global')

      function normalizeTime(raw: FormDataEntryValue | null): string | null {
        if (typeof raw !== 'string' || raw.trim() === '') return null
        const t = raw.trim()
        return t.length === 5 ? `${t}:00` : t
      }

      const dueTimeStr = normalizeTime(fd.get('due_time'))
      const endTimeStr = normalizeTime(fd.get('end_time'))

      await createTask({
        company_id: companyId,
        assigned_to_user_id: ((fd.get('assigned_to_user_id') as string) || null),
        sprint_id: fixedSprintId ?? ((fd.get('sprint_id') as string) || null),
        scope_type: scopeType,
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || null,
        task_type: (fd.get('task_type') as any) || 'secondary',
        status: 'todo',
        priority: (fd.get('priority') as any) || 'normal',
        due_date: (fd.get('due_date') as string) || null,
        due_time: dueTimeStr,
        end_date: (fd.get('end_date') as string) || null,
        end_time: endTimeStr,
        estimated_minutes: fd.get('estimated_minutes') ? parseInt(fd.get('estimated_minutes') as string, 10) : null,
        energy_level: (fd.get('energy_level') as any) || 'medium',
      })
      router.push(redirectAfterCreate)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <UserGuidanceDialog
        title="Aide saisie - Tache"
        entries={[
          { label: 'Perimetre / Societe / Sprint', description: 'Contexte d execution de la tache.' },
          { label: 'Affectation', description: 'Membre responsable de l execution (optionnel).' },
          { label: 'Priorite et echeance', description: 'Aident a ordonner l execution quotidienne.' },
        ]}
        results={[
          { label: 'Backlog', description: 'La tache apparait dans les vues de suivi avec son statut.' },
        ]}
      />
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {fixedSprintId && sprintFromContext ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-3 text-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Hérité du sprint</p>
          <p className="mt-1 text-zinc-200">
            Périmètre : <span className="font-medium text-white">{SCOPE_LABELS[sprintFromContext.scope_type]}</span>
          </p>
          <p className="mt-1 text-zinc-200">
            Société :{' '}
            <span className="font-medium text-white">
              {sprintFromContext.company_id
                ? (() => {
                    const c = companies.find((x) => x.id === sprintFromContext.company_id)
                    return c ? (c.trade_name ?? c.legal_name) : '—'
                  })()
                : '— (sprint sans société)'}
            </span>
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Le périmètre et la société ne sont pas modifiables ici : ils suivent le sprint.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Périmètre</label>
            <select
              name="scope_type"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="global">Global</option>
              <option value="business">Professionnel</option>
              <option value="personal">Personnel</option>
            </select>
          </div>
          {companies.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Société (optionnel)</label>
              <select
                name="company_id"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.trade_name ?? c.legal_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      {fixedSprintId ? (
        <input type="hidden" name="sprint_id" value={fixedSprintId} />
      ) : (
        sprints.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Sprint (optionnel)</label>
            <select
              name="sprint_id"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">—</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Affecter à (équipe)</label>
        <select
          name="assigned_to_user_id"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          disabled={!companyIdForAssignment || assignees.length === 0}
        >
          <option value="">
            {!companyIdForAssignment
              ? 'Sélectionner une entreprise d’abord'
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
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Titre *</label>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          placeholder="Ex: Payer le loyer"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Type</label>
        <select
          name="task_type"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="important">Important</option>
          <option value="secondary">Secondaire</option>
          <option value="admin">Admin</option>
          <option value="follow_up">Suivi</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Priorité</label>
        <select
          name="priority"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="low">Basse</option>
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
          <option value="critical">Critique</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Échéance (date)</label>
          <input
            name="due_date"
            type="date"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Heure (optionnel)</label>
          <input
            name="due_time"
            type="time"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <p className="mt-1 text-[11px] text-zinc-600">Liée à la date d’échéance ci-dessus.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Date de fin (optionnel)</label>
          <input
            name="end_date"
            type="date"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <p className="mt-1 text-[11px] text-zinc-600">Deadline de fin de tâche.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Heure de fin (optionnel)</label>
          <input
            name="end_time"
            type="time"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <p className="mt-1 text-[11px] text-zinc-600">Liée à la date de fin ci-contre.</p>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Description</label>
        <textarea
          name="description"
          rows={2}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Création…' : 'Créer la tâche'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
