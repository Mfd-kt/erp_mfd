'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { addCopilotMemoryItemAction } from '../actions'
import type { CopilotMemoryType } from '../types'

const TYPES: CopilotMemoryType[] = [
  'preference',
  'habit',
  'operational',
  'decision_pattern',
  'topic',
  'risk_note',
  'explicit_user',
]

export function CopilotAddMemoryForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [memoryType, setMemoryType] = useState<CopilotMemoryType>('explicit_user')
  const [key, setKey] = useState('')
  const [valueRaw, setValueRaw] = useState('{}')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    let valueJson: Record<string, unknown>
    try {
      valueJson = JSON.parse(valueRaw) as Record<string, unknown>
    } catch {
      alert('JSON invalide dans la valeur.')
      return
    }
    setLoading(true)
    try {
      await addCopilotMemoryItemAction({
        memory_type: memoryType,
        key: key.trim(),
        value_json: valueJson,
        confidence_score: 0.85,
      })
      setKey('')
      setValueRaw('{}')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-lg border border-dashed border-zinc-700 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ajouter une entrée (explicite)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px] text-zinc-500">Type</label>
          <select
            value={memoryType}
            onChange={(e) => setMemoryType(e.target.value as CopilotMemoryType)}
            disabled={disabled}
            className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 disabled:opacity-50"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-zinc-500">Clé</label>
          <input
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={disabled}
            className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 disabled:opacity-50"
            placeholder="ex: relances_prioritaires"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-zinc-500">Valeur (JSON)</label>
        <textarea
          value={valueRaw}
          onChange={(e) => setValueRaw(e.target.value)}
          rows={4}
          disabled={disabled}
          className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100 disabled:opacity-50"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={disabled || loading || !key.trim()}>
        {loading ? 'Ajout…' : 'Ajouter à la mémoire'}
      </Button>
    </form>
  )
}
