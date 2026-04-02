'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GroupExplainPayload } from '../types'

interface DataExplainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: GroupExplainPayload | null
}

export function DataExplainDialog({ open, onOpenChange, payload }: DataExplainDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
        {payload ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg text-white">{payload.title}</DialogTitle>
              <DialogDescription className="text-left text-zinc-400">{payload.intro}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Calcul</p>
                <p className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-300">
                  {payload.formula}
                </p>
              </div>
              {payload.lines.length > 0 ? (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Détail</p>
                  {payload.lines.some((l) => Boolean(l.href)) ? (
                    <p className="mt-1 text-[10px] text-zinc-500">Les lignes soulignées ouvrent la fiche pour consulter ou modifier.</p>
                  ) : null}
                  <ul className="mt-2 max-h-[min(40vh,320px)] space-y-2 overflow-y-auto rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                    {payload.lines.map((line, i) =>
                      line.value === '' ? (
                        <li key={i} className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          {line.label}
                        </li>
                      ) : (
                        <li key={i} className="border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                          {line.href ? (
                            <Link
                              href={line.href}
                              aria-label={`Ouvrir la fiche : ${line.label}`}
                              className="block rounded-md -m-1 p-1 transition-colors hover:bg-zinc-800/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                              onClick={() => onOpenChange(false)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-zinc-200 underline decoration-zinc-600 decoration-dotted underline-offset-2">
                                  {line.label}
                                </span>
                                <span className="shrink-0 font-mono text-sm font-semibold text-white">{line.value}</span>
                              </div>
                              {line.meta ? <span className="mt-0.5 block text-xs text-zinc-500">{line.meta}</span> : null}
                            </Link>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-zinc-200">{line.label}</span>
                                <span className="shrink-0 font-mono text-sm font-semibold text-white">{line.value}</span>
                              </div>
                              {line.meta ? <span className="text-xs text-zinc-500">{line.meta}</span> : null}
                            </div>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ) : null}
              {payload.footnote ? (
                <p className="text-xs text-amber-200/90 border border-amber-900/40 bg-amber-950/20 rounded-lg px-3 py-2">
                  {payload.footnote}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
