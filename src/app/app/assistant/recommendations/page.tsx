import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { getRecommendations } from '@/modules/assistant/queries'
import { RecommendationCard } from '@/modules/assistant/components/RecommendationCard'
import Link from 'next/link'

export default async function RecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const recommendations = await getRecommendations(supabase, user.id, { limit: 50 })

  const byStatus = {
    open: recommendations.filter((r) => r.status === 'open'),
    accepted: recommendations.filter((r) => r.status === 'accepted'),
    dismissed: recommendations.filter((r) => r.status === 'dismissed'),
    done: recommendations.filter((r) => r.status === 'done'),
  }
  const ignoredLabel = 'Ignorées (dismissed)'

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Recommandations"
        subtitle="Propositions du copilote financier"
      />

      <SectionBlock title="Ouvertes" subtitle="En attente de votre décision.">
        {byStatus.open.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune recommandation ouverte.</p>
        ) : (
          <div className="space-y-2">
            {byStatus.open.map((r) => (
              <RecommendationCard key={r.id} recommendation={r} />
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Acceptées" subtitle="Recommandations que vous avez acceptées.">
        {byStatus.accepted.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune.</p>
        ) : (
          <div className="space-y-2">
            {byStatus.accepted.map((r) => (
              <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <p className="font-medium text-zinc-100">{r.title}</p>
                <p className="text-xs text-zinc-500">Acceptée</p>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title={ignoredLabel} subtitle="Fermées sans exécution — utile pour mesurer la cohérence.">
        {byStatus.dismissed.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune.</p>
        ) : (
          <div className="space-y-2">
            {byStatus.dismissed.map((r) => (
              <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <p className="font-medium text-zinc-100">{r.title}</p>
                <p className="text-xs text-zinc-500">Ignorée</p>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Fait" subtitle="Traitées ou marquées comme réalisées.">
        {byStatus.done.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune.</p>
        ) : (
          <div className="space-y-2">
            {byStatus.done.map((r) => (
              <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <p className="font-medium text-zinc-100">{r.title}</p>
                <p className="text-xs text-zinc-500">Fait</p>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <p className="text-sm text-zinc-500">
        <Link href="/app/assistant" className="hover:text-zinc-300">← Retour au copilote</Link>
      </p>
    </div>
  )
}
