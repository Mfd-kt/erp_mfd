'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateConversationTitle, suggestConversationTitle } from '../actions'
import { Pencil, Check, X, Sparkles } from 'lucide-react'

interface ConversationTitleEditableProps {
  conversationId: string
  title: string
  className?: string
  /** Afficher le bouton pour suggérer un titre par l'agent */
  showSuggestButton?: boolean
}

export function ConversationTitleEditable({
  conversationId,
  title,
  className = '',
  showSuggestButton = true,
}: ConversationTitleEditableProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  async function handleSave() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === title) {
      setEditing(false)
      setValue(title)
      return
    }
    setSaving(true)
    try {
      await updateConversationTitle(conversationId, trimmed)
      setEditing(false)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setValue(title)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-lg font-semibold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          autoFocus
          disabled={saving}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="rounded p-1.5 text-emerald-400 hover:bg-zinc-800 disabled:opacity-50"
          aria-label="Enregistrer"
        >
          <Check size={18} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800"
          aria-label="Annuler"
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  async function handleSuggest() {
    setSuggesting(true)
    try {
      const suggested = await suggestConversationTitle(conversationId, { force: true })
      if (suggested) {
        setValue(suggested)
        router.refresh()
      }
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className={`group flex items-center gap-2 ${className}`}>
      <h1 className="page-hero-title">{title}</h1>
      {showSuggestButton && (
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          className="rounded p-1.5 text-amber-500 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-amber-400 group-hover:opacity-100 disabled:opacity-50"
          aria-label="Suggérer un titre"
          title="L'agent propose un titre"
        >
          <Sparkles size={16} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded p-1.5 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100"
        aria-label="Modifier le titre"
      >
        <Pencil size={16} />
      </button>
    </div>
  )
}
