'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { DataExplainDialog } from '@/modules/group-dashboard/components/DataExplainDialog'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import { cn } from '@/lib/utils'

interface ExplainCalculationTriggerProps {
  payload: GroupExplainPayload
  /** Libellé accessibilité */
  ariaLabel?: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Bouton « ? » ouvrant la popup d’explication du calcul (DataExplainDialog).
 * Utiliser sur les cartes avec lien : le clic stoppe la propagation.
 */
export function ExplainCalculationTrigger({
  payload,
  ariaLabel = 'Détail du calcul',
  className,
  size = 'sm',
}: ExplainCalculationTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          'shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
          className,
        )}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <HelpCircle className={size === 'md' ? 'size-5' : 'size-4'} />
      </button>
      <DataExplainDialog open={open} onOpenChange={setOpen} payload={payload} />
    </>
  )
}
