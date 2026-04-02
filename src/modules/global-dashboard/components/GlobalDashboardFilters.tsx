'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { GlobalPeriod, GlobalScope } from '../types'

const PERIODS: { value: GlobalPeriod; label: string }[] = [
  { value: 30, label: '30 jours' },
  { value: 60, label: '60 jours' },
  { value: 90, label: '90 jours' },
]

const SCOPES: { value: GlobalScope; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'business', label: 'Professionnel' },
  { value: 'personal', label: 'Personnel' },
]

interface GlobalDashboardFiltersProps {
  period: GlobalPeriod
  scope: GlobalScope
}

export function GlobalDashboardFilters({ period, scope }: GlobalDashboardFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setPeriod(value: GlobalPeriod) {
    const next = new URLSearchParams(searchParams)
    next.set('period', String(value))
    router.push(`${pathname}?${next.toString()}`)
  }

  function setScope(value: GlobalScope) {
    const next = new URLSearchParams(searchParams)
    next.set('scope', value)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Période</span>
        <div className="flex gap-1">
          {PERIODS.map(({ value, label }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              className={`h-8 text-xs ${period === value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setPeriod(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="h-4 w-px bg-zinc-700" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Périmètre</span>
        <div className="flex gap-1">
          {SCOPES.map(({ value, label }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              className={`h-8 text-xs ${scope === value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setScope(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
