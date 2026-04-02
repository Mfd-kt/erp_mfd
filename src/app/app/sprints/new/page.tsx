import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { SprintForm } from '@/modules/sprints/components/SprintForm'

export default async function NewSprintPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin) redirect('/app/tasks')

  const companies = scope.companies

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Nouveau sprint"
        subtitle="Définir un objectif et une période"
      />

      <Card className="max-w-xl border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <SprintForm companies={companies} />
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-500">
        <Link href="/app/sprints" className="hover:text-zinc-300">← Retour aux sprints</Link>
      </p>
    </div>
  )
}
