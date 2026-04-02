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
            { value: 'open', label: 'Ouverte' },
            { value: 'partially_paid', label: 'Partiel' },
            { value: 'overdue', label: 'En retard' },
          ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={searchParams?.get('status') ?? ''} onChange={(e) => updateFilter('status', e.target.value)} className={inputClass}>
        {statusOptions.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
      </select>
      <select value={searchParams?.get('priority') ?? ''} onChange={(e) => updateFilter('priority', e.target.value)} className={inputClass}>
        {PRIORITY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
      </select>
      <select value={searchParams?.get('creditor_id') ?? ''} onChange={(e) => updateFilter('creditor_id', e.target.value)} className={`${inputClass} min-w-[180px]`}>
        <option value="">Tous les créanciers</option>
        {creditors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={searchParams?.get('debt_category_id') ?? ''} onChange={(e) => updateFilter('debt_category_id', e.target.value)} className={`${inputClass} min-w-[180px]`}>
        <option value="">Toutes les catégories</option>
        {debtCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button variant="outline" size="sm" className="h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={resetFilters}>
        Réinitialiser
      </Button>
    </div>
  )
}
