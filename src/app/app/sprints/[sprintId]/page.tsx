import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { getSprintWithProgress } from '@/modules/sprints/queries'
import { computeSprintHealth } from '@/modules/sprints/health'
import { getTasksBySprint } from '@/modules/tasks/queries'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionBlock } from '@/components/ui/section-block'
import { Button } from '@/components/ui/button'
import { TaskRow } from '@/modules/tasks/components/TaskRow'
import { SprintEditDialog } from '@/modules/sprints/components/SprintEditDialog'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ sprintId: string }>
}) {
  const { sprintId } = await params
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin) redirect('/app/tasks')

  const [sprint, tasks] = await Promise.all([
    getSprintWithProgress(sprintId),
    getTasksBySprint(sprintId),
  ])

  if (!sprint) notFound()

  const health = computeSprintHealth(sprint)
  const healthBadgeVariant =
    health.status === 'on_track' ? 'default' : health.status === 'at_risk' ? 'secondary' : 'destructive'

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title={sprint.title}
        subtitle={`${formatDate(sprint.start_date)} → ${formatDate(sprint.end_date)} · ${sprint.scope_type}`}
        rightSlot={
          <div className="flex items-center gap-2">
            <SprintEditDialog sprint={sprint} companies={scope.companies} />
            <Link href={`/app/sprints/${sprintId}/tasks/new`}>
              <Button size="sm" className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200">
                <Plus size={14} />
                Ajouter une tâche
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${sprint.progress_percent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {sprint.completed_tasks} / {sprint.total_tasks} tâches
          </p>
        </div>
        <Badge variant={sprint.status === 'active' ? 'default' : 'outline'}>
          {sprint.status === 'active' ? 'En cours' : sprint.status}
        </Badge>
        <Badge variant={healthBadgeVariant} title={`Temps: ${health.timeProgressPercent}% · Tâches: ${health.taskCompletionPercent}%`}>
          {health.label}
        </Badge>
      </div>

      {sprint.goal && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-zinc-300">Objectif</p>
            <p className="mt-1 text-zinc-100">{sprint.goal}</p>
          </CardContent>
        </Card>
      )}

      <SectionBlock title="Tâches du sprint" subtitle="Tâches liées à ce sprint. Création via le bouton ci-dessus.">
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} showSprint={false} />
          ))}
        </div>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center py-8">
            <p className="text-center text-sm text-zinc-500">Aucune tâche pour ce sprint.</p>
            <Link href={`/app/sprints/${sprintId}/tasks/new`} className="mt-4">
              <Button size="sm" variant="outline" className="gap-2 border-zinc-600 text-zinc-200">
                <Plus size={14} />
                Ajouter une tâche
              </Button>
            </Link>
          </div>
        )}
      </SectionBlock>

      <p className="text-sm text-zinc-500">
        <Link href="/app/sprints" className="hover:text-zinc-300">← Retour aux sprints</Link>
      </p>
    </div>
  )
}
