'use client'

import type { Alert } from '../types'
import { AlertCard } from './AlertCard'

interface Props {
  alerts: Alert[]
  companyId?: string
}

export function AlertsList({ alerts, companyId }: Props) {
  if (!alerts.length) {
    return <p className="text-sm text-zinc-500">Aucune alerte pour le moment.</p>
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} companyId={companyId ?? a.companyId ?? undefined} />
      ))}
    </div>
  )
}
