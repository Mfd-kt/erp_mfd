'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { DebtCategory, DebtType } from '@/lib/supabase/types'

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Toutes fréquences' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'yearly', label: 'Annuel' },
] as const

const inputClass = 'h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700'

interface RecurringRulesFiltersProps {
  debtCategories: (DebtCategory & { debt_types?: DebtType })[]
}

export function RecurringRulesFilters({ debtCategories }: RecurringRulesFiltersProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={searchParams?.get('frequency') ?? ''} onChange={(e) => updateFilter('frequency', e.target.value)} className={inputClass}>
        {FREQUENCY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
      </select>
      <select value={searchParams?.get('is_active') ?? ''} onChange={(e) => updateFilter('is_active', e.target.value)} className={inputClass}>
        <option value="">Tous (actif/inactif)</option>
        <option value="true">Actives</option>
        <option value="false">Inactives</option>
      </select>
      <select value={searchParams?.get('auto_generate') ?? ''} onChange={(e) => updateFilter('auto_generate', e.target.value)} className={inputClass}>
        <option value="">Auto / manuel</option>
        <option value="true">Auto-génération activée</option>
        <option value="false">Manuel uniquement</option>
      </select>
      <select value={searchParams?.get('debt_category_id') ?? ''} onChange={(e) => updateFilter('debt_category_id', e.target.value)} className={`${inputClass} min-w-[200px]`}>
        <option value="">Toutes les catégories</option>
        {debtCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button variant="outline" size="sm" className="h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={resetFilters}>
        Réinitialiser
      </Button>
    </div>
  )
}
