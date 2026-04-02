'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateMemoryAction, deleteMemoryAction } from '../actions'
import type { AssistantMemory } from '../types'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import Link from 'next/link'

interface MemoryListProps {
  memories: AssistantMemory[]
  sourceFilter?: string
  sourceLabels: Record<string, string>
}

export function MemoryList({ memories, sourceFilter, sourceLabels }: MemoryListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKey, setEditKey] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editConfidence, setEditConfidence] = useState(0.8)

  function startEdit(m: AssistantMemory) {
    setEditingId(m.id)
    setEditKey(m.key)
    setEditValue(JSON.stringify(m.value_json, null, 2))
    setEditConfidence(m.confidence)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      let valueJson: Record<string, unknown> = {}
      try {
        valueJson = JSON.parse(editValue) as Record<string, unknown>
      } catch {
        throw new Error('JSON invalide')
      }
      await updateMemoryAction(editingId, {
        key: editKey,
        value_json: valueJson,
        confidence: editConfidence,
      })
      setEditingId(null)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette mémoire ?')) return
    try {
      await deleteMemoryAction(id)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  return (
    <div className="space-y-4">
      {!sourceFilter && (
        <div className="flex gap-2 mb-4">
          <Link href="/app/assistant/memory">
            <Button variant="outline" size="sm">Toutes</Button>
          </Link>
          <Link href="/app/assistant/memory?source=explicit_feedback">
            <Button variant="outline" size="sm">Retour explicite</Button>
          </Link>
          <Link href="/app/assistant/memory?source=behavior">
            <Button variant="outline" size="sm">Comportement</Button>
          </Link>
          <Link href="/app/assistant/memory?source=system_rule">
            <Button variant="outline" size="sm">Règle système</Button>
          </Link>
        </div>
      )}

      {memories.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune mémoire.</p>
      ) : (
        <div className="space-y-3">
          {memories.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              {editingId === m.id ? (
                <div className="space-y-3">
                  <input
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    placeholder="Clé"
                  />
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-100 min-h-[80px]"
                    placeholder="Valeur (JSON)"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500">Confiance:</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={editConfidence}
                      onChange={(e) => setEditConfidence(Number(e.target.value))}
                      className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} className="text-emerald-400">
                      <Check size={14} className="mr-1" /> Enregistrer
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X size={14} className="mr-1" /> Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-zinc-200">{m.key}</p>
                    <pre className="mt-1 text-xs text-zinc-500 overflow-x-auto max-h-24">
                      {JSON.stringify(m.value_json, null, 2)}
                    </pre>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {sourceLabels[m.source] ?? m.source}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        confiance: {(m.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => startEdit(m)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-red-400" onClick={() => handleDelete(m.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
