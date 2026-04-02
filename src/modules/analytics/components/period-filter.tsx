'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PeriodPreset } from '../schema'

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'current_month', label: 'Mois en cours' },
  { value: 'last_3_months', label: '3 derniers mois' },
  { value: 'last_6_months', label: '6 derniers mois' },
  { value: 'custom', label: 'Personnalisé' },
]

interface PeriodFilterProps {
  currentPreset: PeriodPreset
  from: string
  to: string
}

export function PeriodFilter({ currentPreset, from, to }: PeriodFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)

  function setPreset(preset: PeriodPreset) {
    const next = new URLSearchParams(searchParams)
    next.set('preset', preset)
    if (preset !== 'custom') {
      next.delete('from')
      next.delete('to')
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  function applyCustom() {
    const next = new URLSearchParams(searchParams)
    next.set('preset', 'custom')
    next.set('from', customFrom)
    next.set('to', customTo)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-400 mr-1">Période :</span>
      {PRESETS.map(({ value, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          className={`h-8 text-xs ${currentPreset === value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          onClick={() => setPreset(value)}
        >
          {label}
        </Button>
      ))}
      {currentPreset === 'custom' && (
        <span className="inline-flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded border border-zinc-600 bg-zinc-800 text-zinc-200 text-xs px-2"
          />
          <span className="text-zinc-500">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded border border-zinc-600 bg-zinc-800 text-zinc-200 text-xs px-2"
          />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={applyCustom}>
            Appliquer
          </Button>
        </span>
      )}
    </div>
  )
}
