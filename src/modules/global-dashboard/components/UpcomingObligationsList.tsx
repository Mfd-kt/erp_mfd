'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import type { UpcomingObligation } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface UpcomingObligationsListProps {
  upcoming: UpcomingObligation[]
  overdue: UpcomingObligation[]
}

export function UpcomingObligationsList({ upcoming, overdue }: UpcomingObligationsListProps) {
  const hasOverdue = overdue.length > 0
  const displayList = hasOverdue ? overdue : upcoming

  if (displayList.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p className="text-sm text-zinc-500">Aucune obligation à échéance</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hasOverdue && (
        <p className="text-xs font-medium uppercase tracking-wider text-red-400">
          {overdue.length} en retard
        </p>
      )}
      <div className="space-y-2">
        {displayList.slice(0, 8).map((ob) => (
          <Link
            key={ob.id}
            href={ob.href}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{ob.title}</p>
              <p className="text-xs text-zinc-500">
                {ob.companyName} · {formatDate(ob.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-medium text-zinc-200">
                {formatCurrency(ob.remaining, ob.currency)}
              </span>
              {ob.isOverdue && (
                <Badge variant="destructive" className="text-[10px] shrink-0">En retard</Badge>
              )}
              <ChevronRight size={14} className="text-zinc-500 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
