'use client'

import { Badge } from '@/components/ui/badge'
import type { FrequencyType } from '@/lib/supabase/types'

const LABELS: Record<FrequencyType, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
}

const STYLES: Record<FrequencyType, string> = {
  monthly: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  quarterly: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  yearly: 'border-zinc-700 bg-zinc-900 text-zinc-300',
}

interface RecurringFrequencyBadgeProps {
  frequency: FrequencyType
}

export function RecurringFrequencyBadge({ frequency }: RecurringFrequencyBadgeProps) {
  return (
    <Badge variant="outline" className={`h-6 rounded-full px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] ${STYLES[frequency]}`}>
      {LABELS[frequency]}
    </Badge>
  )
}
