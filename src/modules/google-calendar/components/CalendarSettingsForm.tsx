'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GoogleCalendarSelection } from '../types'
import { updateCalendarSelection } from '../actions'
import { cn } from '@/lib/utils'

export function CalendarSettingsForm({ items }: { items: GoogleCalendarSelection[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucun agenda listé. Utilise « Resynchroniser les agendas » pour charger la liste depuis Google.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((row) => (
        <li
          key={row.calendar_id}
          className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
        >
          <input
            type="checkbox"
            className="size-4 rounded border-zinc-600"
            checked={row.is_selected}
            disabled={pending}
            onChange={(e) => {
              const checked = e.target.checked
              startTransition(async () => {
                await updateCalendarSelection(row.calendar_id, checked)
                router.refresh()
              })
            }}
          />
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-zinc-700"
            style={{ backgroundColor: row.color ?? '#52525b' }}
            aria-hidden
          />
          <span className={cn('flex-1 text-sm', row.is_selected ? 'text-zinc-100' : 'text-zinc-500')}>
            {row.calendar_name}
          </span>
          <span className="font-mono text-[10px] text-zinc-600">{row.calendar_id}</span>
        </li>
      ))}
    </ul>
  )
}
