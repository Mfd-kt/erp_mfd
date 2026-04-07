'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deactivateCopilotMemoryItemAction } from '../actions'
import type { CopilotMemoryItemRow } from '../types'
import { Trash2 } from 'lucide-react'

export function CopilotMemoryListClient({
  items,
  disableActions = false,
}: {
  items: CopilotMemoryItemRow[]
  disableActions?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Aucune entrée de mémoire structurée — utilise le formulaire ci-dessous.</p>
  }

  async function onDeactivate(id: string) {
    if (disableActions) return
    setLoading(id)
    try {
      await deactivateCopilotMemoryItemAction(id)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li
          key={m.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium text-zinc-200">
              <span className="text-amber-500/90">[{m.memory_type}]</span> {m.key}
            </p>
            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-500">
              {JSON.stringify(m.value_json, null, 0)}
            </pre>
            <p className="mt-1 text-[10px] text-zinc-600">
              confiance {m.confidence_score.toFixed(2)} · sources {m.source_count}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-500 hover:text-red-400"
            disabled={disableActions || loading === m.id}
            onClick={() => onDeactivate(m.id)}
            aria-label="Désactiver cette mémoire"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
