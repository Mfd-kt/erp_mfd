import { Badge } from '@/components/ui/badge'
import type { RevenueStatus } from '@/lib/supabase/types'

const statusConfig: Record<
  RevenueStatus,
  { label: string; className: string }
> = {
  expected: { label: 'Attendu', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  partial: { label: 'Partiel', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  received: { label: 'Reçu', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  cancelled: { label: 'Annulé', className: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
}

interface RevenueStatusBadgeProps {
  status: RevenueStatus
  className?: string
}

export function RevenueStatusBadge({ status, className = '' }: RevenueStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'border-zinc-700 bg-zinc-900 text-zinc-400' }
  return (
    <Badge variant="outline" className={`h-6 rounded-full px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] ${config.className} ${className}`}>
      {config.label}
    </Badge>
  )
}
