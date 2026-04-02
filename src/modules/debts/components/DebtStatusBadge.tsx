import { Badge } from '@/components/ui/badge'
import type { DebtStatus } from '@/lib/supabase/types'

const statusConfig: Record<
  DebtStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Brouillon', className: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
  open: { label: 'Ouverte', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  partially_paid: { label: 'Partiel', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  paid: { label: 'Payée', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  cancelled: { label: 'Annulée', className: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
  overdue: { label: 'En retard', className: 'border-red-500/30 bg-red-500/10 text-red-300' },
}

interface DebtStatusBadgeProps {
  status: DebtStatus
  className?: string
}

export function DebtStatusBadge({ status, className = '' }: DebtStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'border-zinc-700 bg-zinc-900 text-zinc-400' }
  return (
    <Badge variant="outline" className={`h-6 rounded-full px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] ${config.className} ${className}`}>
      {config.label}
    </Badge>
  )
}
