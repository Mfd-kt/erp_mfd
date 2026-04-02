'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { RevenueClient } from '@/lib/supabase/types'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'expected', label: 'Attendu' },
  { value: 'partial', label: 'Partiel' },
  { value: 'received', label: 'Reçu' },
  { value: 'cancelled', label: 'Annulé' },
] as const

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes catégories' },
  { value: 'client', label: 'Client' },
  { value: 'goods_sale', label: 'Vente de bien' },
  { value: 'other', label: 'Autre' },
] as const

const inputClass = 'h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700'

interface RevenueFiltersProps {
  revenueClients: RevenueClient[]
}

export function RevenueFilters({ revenueClients }: RevenueFiltersProps) {
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
      <select value={searchParams?.get('status') ?? ''} onChange={(e) => updateFilter('status', e.target.value)} className={inputClass}>
        {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
      </select>
      <select value={searchParams?.get('revenue_category') ?? ''} onChange={(e) => updateFilter('revenue_category', e.target.value)} className={inputClass}>
        {CATEGORY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
      </select>
      <select value={searchParams?.get('client_id') ?? ''} onChange={(e) => updateFilter('client_id', e.target.value)} className={`${inputClass} min-w-[180px]`}>
        <option value="">Tous les clients</option>
        {revenueClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
      </select>
      <input type="date" value={searchParams?.get('expected_date_from') ?? ''} onChange={(e) => updateFilter('expected_date_from', e.target.value)} className={inputClass} />
      <input type="date" value={searchParams?.get('expected_date_to') ?? ''} onChange={(e) => updateFilter('expected_date_to', e.target.value)} className={inputClass} />
      <Button variant="outline" size="sm" className="h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={resetFilters}>
        Réinitialiser
      </Button>
    </div>
  )
}
