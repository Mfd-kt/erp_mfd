'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import type { Company } from '@/lib/supabase/types'
import { createSprint } from '../actions'

interface SprintFormProps {
  companies: Company[]
}

export function SprintForm({ companies }: SprintFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    try {
      await createSprint({
        company_id: (fd.get('company_id') as string) || null,
        scope_type: (fd.get('scope_type') as 'business' | 'personal' | 'global') || 'global',
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || null,
        goal: (fd.get('goal') as string) || null,
        status: 'planned',
        priority: 'normal',
        start_date: fd.get('start_date') as string,
        end_date: fd.get('end_date') as string,
      })
      router.push('/app/sprints')
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
        title="Aide saisie - Sprint"
        entries={[
          { label: 'Perimetre', description: 'Global, professionnel ou personnel.' },
          { label: 'Titre / Objectif', description: 'Donne le cap et le resultat attendu du sprint.' },
          { label: 'Dates', description: 'Cadre temporel du sprint.' },
        ]}
        results={[
          { label: 'Pilotage execution', description: 'Le sprint structure les taches et le suivi d avancement.' },
        ]}
      />
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
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
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Titre *</label>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          placeholder="Ex: Q2 2026 — Trésorerie"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Objectif</label>
        <input
          name="goal"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          placeholder="Ex: Sécuriser la trésorerie du trimestre"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Description</label>
        <textarea
          name="description"
          rows={2}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Début *</label>
          <input
            name="start_date"
            type="date"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Fin *</label>
          <input
            name="end_date"
            type="date"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Création…' : 'Créer le sprint'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
