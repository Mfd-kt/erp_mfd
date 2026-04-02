'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

const inputClass =
  'h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700'

interface PilotageFiltersProps {
  from: string
  to: string
  horizonDays: number
}

export function PilotageFilters({ from, to, horizonDays }: PilotageFiltersProps) {
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
    const next = new URLSearchParams()
    next.set('from', from)
    next.set('to', to)
    next.set('horizon_days', String(horizonDays))
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        value={searchParams?.get('from') ?? from}
        onChange={(e) => updateFilter('from', e.target.value)}
        className={inputClass}
      />
      <input
        type="date"
        value={searchParams?.get('to') ?? to}
        onChange={(e) => updateFilter('to', e.target.value)}
        className={inputClass}
      />
      <select
        value={searchParams?.get('horizon_days') ?? String(horizonDays)}
        onChange={(e) => updateFilter('horizon_days', e.target.value)}
        className={inputClass}
      >
        <option value="15">Horizon 15 jours</option>
        <option value="30">Horizon 30 jours</option>
        <option value="60">Horizon 60 jours</option>
        <option value="90">Horizon 90 jours</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        className="h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
        onClick={resetFilters}
      >
        Réinitialiser
      </Button>
    </div>
  )
}
