import { createClient } from '@/lib/supabase/server'
import { getDailyPlan } from '@/modules/planning/queries'
import type { Task } from '@/modules/tasks/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_LABEL: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
}

const TYPE_LABEL: Record<string, string> = {
  important: 'Important',
  secondary: 'Secondaire',
  admin: 'Admin',
  follow_up: 'Suivi',
}

function TaskRow({ task, label }: { task: Task; label: string }) {
  return (
    <div className="grid gap-1 border-b border-zinc-800/80 py-2 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-100">{task.title}</p>
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
      <span className="text-xs text-zinc-400">{TYPE_LABEL[task.task_type] ?? task.task_type}</span>
      <span className="text-xs text-zinc-400">{STATUS_LABEL[task.status] ?? task.status}</span>
    </div>
  )
}

export async function DailyPlanSummary({
  userId,
  journalDate,
}: {
  userId: string
  journalDate: string
}) {
  const supabase = await createClient()
  const plan = await getDailyPlan(userId, journalDate, supabase)
  if (!plan) return null

  const rows: { task: Task; label: string }[] = []
  if (plan.primary_task) rows.push({ task: plan.primary_task, label: 'Tâche principale' })
  if (plan.secondary_task_1) rows.push({ task: plan.secondary_task_1, label: 'Secondaire 1' })
  if (plan.secondary_task_2) rows.push({ task: plan.secondary_task_2, label: 'Secondaire 2' })

  if (rows.length === 0) return null

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 ring-zinc-800">
      <CardHeader className="border-b border-zinc-800/80 pb-3">
        <CardTitle className="text-base font-semibold text-zinc-100">Plan du jour</CardTitle>
        <p className="text-xs text-zinc-500">Lecture seule — contexte pour ton bilan</p>
      </CardHeader>
      <CardContent className="pt-2">
        {rows.map(({ task, label }) => (
          <TaskRow key={task.id} task={task} label={label} />
        ))}
      </CardContent>
    </Card>
  )
}
