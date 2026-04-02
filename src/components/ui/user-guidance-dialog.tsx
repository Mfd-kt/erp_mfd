'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type GuidanceItem = {
  label: string
  description: string
}

interface UserGuidanceDialogProps {
  title: string
  description?: string
  triggerLabel?: string
  entries?: GuidanceItem[]
  results?: GuidanceItem[]
}

export function UserGuidanceDialog({
  title,
  description,
  triggerLabel = 'Comprendre',
  entries = [],
  results = [],
}: UserGuidanceDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          />
        }
      >
        <HelpCircle className="size-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-xl border border-zinc-800 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {entries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Entrées (formulaire)</p>
            <ul className="space-y-2">
              {entries.map((item) => (
                <li key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                  <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Résultats (lecture)</p>
            <ul className="space-y-2">
              {results.map((item) => (
                <li key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                  <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
