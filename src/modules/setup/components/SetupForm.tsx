'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { CURRENCY_OPTIONS } from '@/lib/currencies'
import { setupInitialGroup } from '../actions'

export function SetupForm() {
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
      await setupInitialGroup({
        groupName: fd.get('groupName') as string,
        baseCurrency: fd.get('baseCurrency') as string,
      })
      router.push('/app/settings/companies')
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
        title="Aide - Configuration initiale"
        entries={[
          { label: 'Nom du groupe', description: 'Nom principal de votre organisation dans l application.' },
          { label: 'Devise de base', description: 'Devise de consolidation par defaut des vues groupe.' },
        ]}
        results={[
          { label: 'Creation espace', description: 'Le groupe est cree puis redirection vers la gestion des societes.' },
        ]}
      />
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Nom du groupe *</label>
        <input
          name="groupName"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          placeholder="Ex: Groupe Effinor"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Devise de base *</label>
        <select
          name="baseCurrency"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({c.code})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Création…' : 'Créer le groupe'}
      </Button>
    </form>
  )
}
