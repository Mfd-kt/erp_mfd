'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertSeverityBadge } from './AlertSeverityBadge'
import type { Alert } from '../types'
import { getAlertQuickActions } from '@/modules/actions/registry'
import { createTaskFromAlert } from '@/modules/tasks/actions-from-alerts'

interface Props {
  alert: Alert
  companyId?: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function AlertCard({ alert, companyId }: Props) {
  const router = useRouter()
  let href: string | null = null
  if (alert.entityType === 'debt' && companyId && alert.entityId) {
    href = `/app/${companyId}/debts/${alert.entityId}`
  } else if (alert.entityType === 'revenue' && companyId && alert.entityId) {
    href = `/app/${companyId}/revenues/${alert.entityId}`
  } else if (alert.entityType === 'forecast') {
    href = companyId ? `/app/${companyId}/forecast` : '/app/forecast'
  }
  const actions = getAlertQuickActions(alert, companyId)

  async function handleCreateTask() {
    await createTaskFromAlert(alert)
    router.refresh()
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-100">{alert.title}</p>
            <p className="text-xs text-zinc-400">{alert.message}</p>
          </div>
          <AlertSeverityBadge severity={alert.severity} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl border-zinc-800 bg-zinc-900 px-3 text-zinc-300 hover:bg-zinc-800"
            onClick={handleCreateTask}
          >
            Créer tâche
          </Button>
          {actions.map((action) => (
            <Button
              key={`${alert.id}-${action.label}`}
              size="sm"
              variant={action.variant === 'primary' ? 'default' : 'outline'}
              className={
                action.variant === 'primary'
                  ? 'h-8 rounded-xl bg-white px-3 text-zinc-950 hover:bg-zinc-200'
                  : 'h-8 rounded-xl border-zinc-800 bg-zinc-900 px-3 text-zinc-300 hover:bg-zinc-800'
              }
              render={<Link href={action.href} />}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{formatDate(alert.createdAt)}</span>
          {href ? (
            <Link href={href} className="text-blue-400 hover:text-blue-300">
              Ouvrir →
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
