'use client'

import Link from 'next/link'
import type { AssistantConversation } from '../types'

interface ConversationListProps {
  conversations: AssistantConversation[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Aucune conversation récente.</p>
    )
  }

  return (
    <div className="space-y-1">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/app/assistant/${c.id}`}
          className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800/50 hover:text-zinc-100"
        >
          <p className="truncate font-medium">{c.title}</p>
          <p className="text-xs text-zinc-500">
            {c.last_message_at
              ? new Date(c.last_message_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : '—'}
          </p>
        </Link>
      ))}
    </div>
  )
}
