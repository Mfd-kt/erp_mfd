import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/modules/tasks/queries'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { TasksList } from '@/modules/tasks/components/TasksList'

export default async function TasksPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  const tasks = await getTasks(
    scope.role === 'viewer'
      ? { assigned_to_user_id: scope.userId }
      : undefined
  )

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Tâches"
        subtitle={
          scope.role === 'viewer'
            ? "Tâches qui vous sont assignées."
            : "Liste de toutes les tâches — tri et filtres. La création se fait depuis un sprint."
        }
      />

      <SectionBlock title="Toutes les tâches" subtitle="Triez par échéance, priorité et plus encore. Filtrez par statut ou type.">
        <TasksList tasks={tasks} />
      </SectionBlock>
    </div>
  )
}
