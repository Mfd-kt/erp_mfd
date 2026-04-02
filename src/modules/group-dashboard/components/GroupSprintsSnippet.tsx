'use client'

import Link from 'next/link'
import type { Sprint } from '@/modules/sprints/types'

interface GroupSprintsSnippetProps {
  sprints: Sprint[]
}

export function GroupSprintsSnippet({ sprints }: GroupSprintsSnippetProps) {
  function statusLabel(s: Sprint['status']) {
    if (s === 'active') return 'Actif'
    if (s === 'planned') return 'Planifié'
    if (s === 'completed') return 'Terminé'
    return 'Annulé'
  }

  return (
    <div className="space-y-2">
      {sprints.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-sm text-zinc-500">
          Aucun sprint actif ou planifié.
        </p>
      ) : (
        sprints.map((sprint) => (
          <Link
            key={sprint.id}
            href={`/app/sprints/${sprint.id}`}
            className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 hover:border-zinc-700"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-medium text-zinc-100">{sprint.title}</p>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">{statusLabel(sprint.status)}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(`${sprint.start_date}T12:00:00`).toLocaleDateString('fr-FR')} →{' '}
              {new Date(`${sprint.end_date}T12:00:00`).toLocaleDateString('fr-FR')}
            </p>
          </Link>
        ))
      )}
      <Link href="/app/sprints" className="inline-block text-xs text-amber-400 hover:text-amber-300">
        Voir tous les sprints →
      </Link>
    </div>
  )
}
