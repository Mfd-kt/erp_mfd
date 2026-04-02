import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { getSprintWithProgress } from '@/modules/sprints/queries'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { TaskForm } from '@/modules/tasks/components/TaskForm'

export default async function NewTaskInSprintPage({
  params,
}: {
  params: Promise<{ sprintId: string }>
}) {
  const { sprintId } = await params
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin) redirect('/app/tasks')

  const sprintFull = await getSprintWithProgress(sprintId)
  if (!sprintFull) notFound()

  const { total_tasks: _t, completed_tasks: _c, progress_percent: _p, ...sprint } = sprintFull

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Nouvelle tâche"
        subtitle={`Sprint « ${sprint.title} » — la tâche sera rattachée à ce sprint.`}
      />

      <Card className="max-w-xl border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <TaskForm
            companies={scope.companies}
            sprints={[sprint]}
            fixedSprintId={sprintId}
            redirectAfterCreate={`/app/sprints/${sprintId}`}
          />
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-500">
        <Link href={`/app/sprints/${sprintId}`} className="hover:text-zinc-300">
          ← Retour au sprint
        </Link>
      </p>
    </div>
  )
}
