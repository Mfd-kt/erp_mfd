'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateSprint } from '../actions'
import type { Sprint } from '../types'
import type { Company } from '@/lib/supabase/types'

interface SprintEditDialogProps {
  sprint: Sprint
  companies: Company[]
}

export function SprintEditDialog({ sprint, companies }: SprintEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_id: sprint.company_id ?? '',
    scope_type: sprint.scope_type,
    title: sprint.title,
    goal: sprint.goal ?? '',
    description: sprint.description ?? '',
    status: sprint.status,
    priority: sprint.priority,
    start_date: sprint.start_date,
    end_date: sprint.end_date,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await updateSprint({
        id: sprint.id,
        company_id: form.company_id || null,
        scope_type: form.scope_type as Sprint['scope_type'],
        title: form.title,
        description: form.description || null,
        goal: form.goal || null,
        status: form.status as Sprint['status'],
        priority: form.priority as Sprint['priority'],
        start_date: form.start_date,
        end_date: form.end_date,
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Modifier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le sprint</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Mets a jour les informations principales du sprint.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Titre *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Objectif</label>
              <input
                value={form.goal}
                onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Périmètre</label>
                <select
                  value={form.scope_type}
                  onChange={(e) => setForm((p) => ({ ...p, scope_type: e.target.value as Sprint['scope_type'] }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="global">Global</option>
                  <option value="business">Professionnel</option>
                  <option value="personal">Personnel</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Société</label>
                <select
                  value={form.company_id}
                  onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.trade_name ?? c.legal_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Statut</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Sprint['status'] }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="planned">Prévu</option>
                  <option value="active">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Priorité</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Sprint['priority'] }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Début *</label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Fin *</label>
                <input
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {error ? (
              <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
