import { Badge } from '@/components/ui/badge'
import type { DebtPriority } from '@/lib/supabase/types'

const priorityConfig: Record<DebtPriority, { label: string; className: string }> = {
  critical: { label: 'Critique', className: 'border-red-500/30 bg-red-500/10 text-red-300' },
  high: { label: 'Haute', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  normal: { label: 'Normale', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  low: { label: 'Basse', className: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
}

interface DebtPriorityBadgeProps {
  priority: DebtPriority
  className?: string
}

export function DebtPriorityBadge({ priority, className = '' }: DebtPriorityBadgeProps) {
  const config = priorityConfig[priority] ?? { label: priority, className: 'border-zinc-700 bg-zinc-900 text-zinc-400' }
  return (
    <Badge variant="outline" className={`h-6 rounded-full px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] ${config.className} ${className}`}>
      {config.label}
    </Badge>
  )
}
