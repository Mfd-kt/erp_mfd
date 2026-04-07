'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Creditor, DebtCategory } from '@/lib/supabase/types'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'open', label: 'Ouverte' },
  { value: 'partially_paid', label: 'Partiel' },
  { value: 'paid', label: 'Payée' },
  { value: 'overdue', label: 'En retard' },
] as const

const PRIORITY_OPTIONS = [
  { value: '', label: 'Toutes priorités' },
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Haute' },
  { value: 'normal', label: 'Normale' },
  { value: 'low', label: 'Basse' },
] as const

interface DebtFiltersProps {
  creditors: Creditor[]
  debtCategories: DebtCategory[]
  statusMode?: 'active' | 'archived' | 'all'
}

const inputClass = 'h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700'

export function DebtFilters({ creditors, debtCategories, statusMode = 'active' }: DebtFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) next.set(key, value)
    else next.delete(key)
    const q = next.toString()
    router.push(q ? `${pathname}?${q}` : pathname ?? '/')
  }

  function resetFilters() {
    router.push(pathname ?? '/')
  }

  const statusOptions =
    statusMode === 'archived'
      ? [
          { value: '', label: 'Toutes archivées' },
          { value: 'paid', label: 'Payée' },
          { value: 'cancelled', label: 'Annulée' },
        ]
      : statusMode === 'all'
        ? STATUS_OPTIONS
        : [
            { value: '', label: 'Tous les statuts' },
            { value: 'not_overdue', label: 'À jour (pas en retard)' },
            { value: 'open', label: 'Ouverte' },
            { value: 'partially_paid', label: 'Partiel' },
            { value: 'overdue', label: 'En retard' },
          ]

  const currentStatus = searchParams?.get('status') ?? ''

  function setStatus(value: string) {
    updateFilter('status', value)
  }

  return (
    <div className="space-y-3">
      {statusMode === 'active' ? (
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label="Filtrage rapide par statut"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Raccourcis statut
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={currentStatus === '' ? 'secondary' : 'outline'}
              className={
                currentStatus === ''
                  ? 'rounded-xl border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white dark:bg-zinc-200'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('')}
            >
              Toutes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'overdue' ? 'secondary' : 'outline'}
              className={
                currentStatus === 'overdue'
                  ? 'rounded-xl border-amber-600/50 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('overdue')}
            >
              En retard
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'not_overdue' ? 'secondary' : 'outline'}
              className={
                currentStatus === 'not_overdue'
                  ? 'rounded-xl border-emerald-700/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('not_overdue')}
            >
              À jour
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'open' ? 'secondary' : 'outline'}
              className={
                currentStatus === 'open'
                  ? 'rounded-xl border-zinc-600 bg-zinc-700 text-white hover:bg-zinc-600'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('open')}
            >
              Ouvertes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'partially_paid' ? 'secondary' : 'outline'}
              className={
                currentStatus === 'partially_paid'
                  ? 'rounded-xl border-sky-700/50 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('partially_paid')}
            >
              Partiel
            </Button>
          </div>
        </div>
      ) : null}

      {statusMode === 'archived' ? (
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label="Filtrage rapide archivé"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Raccourcis statut
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={currentStatus === '' ? 'secondary' : 'outline'}
              className={
                currentStatus === ''
                  ? 'rounded-xl border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white dark:bg-zinc-200'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('')}
            >
              Toutes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'paid' ? 'secondary' : 'outline'}
              className={
                currentStatus === 'paid'
                  ? 'rounded-xl border-emerald-700/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('paid')}
            >
              Payées
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'cancelled' ? 'secondary' : 'outline'}
              className={
                currentStatus === 'cancelled'
                  ? 'rounded-xl border-zinc-600 bg-zinc-700 text-white hover:bg-zinc-600'
                  : 'rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
              }
              onClick={() => setStatus('cancelled')}
            >
              Annulées
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <div className="space-y-1.5 lg:col-span-1">
          <label htmlFor="debt-filter-status" className="block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Statut
          </label>
          <select
            id="debt-filter-status"
            value={searchParams?.get('status') ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className={`${inputClass} w-full`}
          >
            {statusOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 lg:col-span-1">
          <label htmlFor="debt-filter-priority" className="block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Priorité
          </label>
          <select
            id="debt-filter-priority"
            value={searchParams?.get('priority') ?? ''}
            onChange={(e) => updateFilter('priority', e.target.value)}
            className={`${inputClass} w-full`}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="debt-filter-creditor" className="block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Créancier
          </label>
          <select
            id="debt-filter-creditor"
            value={searchParams?.get('creditor_id') ?? ''}
            onChange={(e) => updateFilter('creditor_id', e.target.value)}
            className={`${inputClass} w-full min-w-0`}
          >
            <option value="">Tous les créanciers</option>
            {creditors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 lg:col-span-1">
          <label htmlFor="debt-filter-category" className="block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Catégorie
          </label>
          <select
            id="debt-filter-category"
            value={searchParams?.get('debt_category_id') ?? ''}
            onChange={(e) => updateFilter('debt_category_id', e.target.value)}
            className={`${inputClass} w-full min-w-0`}
          >
            <option value="">Toutes les catégories</option>
            {debtCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end lg:col-span-1">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 lg:w-auto"
            onClick={resetFilters}
          >
            Réinitialiser
          </Button>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Les raccourcis appliquent le même filtre « Statut » que le menu déroulant (ex. « À jour » = ouvertes + partielles, hors retard). Seules les dettes correspondant aux critères sont listées. « Réinitialiser » enlève tous les filtres de l’URL.
      </p>
    </div>
  )
}
