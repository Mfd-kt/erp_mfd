import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { getSprints } from '@/modules/sprints/queries'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionBlock } from '@/components/ui/section-block'
import { Plus } from 'lucide-react'
import type { Sprint } from '@/modules/sprints/types'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    planned: 'Prévu',
    active: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
  }
  const variant = status === 'active' ? 'default' : status === 'completed' ? 'secondary' : 'outline'
  return <Badge variant={variant as any}>{map[status] ?? status}</Badge>
}

export default async function SprintsPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin) redirect('/app/tasks')

  const sprints = await getSprints()

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Sprints"
        subtitle="Objectifs et cycles d'exécution"
        rightSlot={
          <Link href="/app/sprints/new">
            <Button size="sm">
              <Plus size={14} />
              Nouveau sprint
            </Button>
          </Link>
        }
      />

      <SectionBlock title="Tous les sprints" subtitle="Filtrez par statut ou périmètre.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sprints.map((s) => (
            <Link key={s.id} href={`/app/sprints/${s.id}`}>
              <Card className="border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-zinc-100">{s.title}</h3>
                    {statusBadge(s.status)}
                  </div>
                  {s.goal && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{s.goal}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <span>{formatDate(s.start_date)}</span>
                    <span>→</span>
                    <span>{formatDate(s.end_date)}</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {s.scope_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {sprints.length === 0 && (
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-zinc-500">Aucun sprint</p>
              <Link href="/app/sprints/new" className="mt-4">
                <Button size="sm">Créer un sprint</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </SectionBlock>
    </div>
  )
}
