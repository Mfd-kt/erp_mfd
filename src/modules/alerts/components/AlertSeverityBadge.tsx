'use client'

import { Badge } from '@/components/ui/badge'
import type { AlertSeverity } from '@/lib/supabase/types'

interface Props {
  severity: AlertSeverity
}

export function AlertSeverityBadge({ severity }: Props) {
  if (severity === 'critical') {
    return <Badge variant="destructive">Critique</Badge>
  }
  if (severity === 'warning') {
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/40">Avertissement</Badge>
  }
  return <Badge variant="outline" className="border-zinc-600 text-zinc-200">Info</Badge>
}
