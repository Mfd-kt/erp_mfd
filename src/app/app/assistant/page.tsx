import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionBlock } from '@/components/ui/section-block'
import { getConversations, getRecentRuns, getRecommendations } from '@/modules/assistant/queries'
import { createConversation } from '@/modules/assistant/actions'
import { DailyBriefingCard } from '@/modules/assistant/components/DailyBriefingCard'
import { ConversationList } from '@/modules/assistant/components/ConversationList'
import { PendingConfirmationsBanner } from '@/modules/assistant/components/PendingConfirmationsBanner'
import { RecommendationCard } from '@/modules/assistant/components/RecommendationCard'
import { QuickPromptButton } from '@/modules/assistant/components/QuickPromptButton'
import { NewConversationButton } from '@/modules/assistant/components/NewConversationButton'

export default async function AssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [conversations, runs, recommendations] = await Promise.all([
    getConversations(supabase, user.id, { status: 'active', limit: 10 }),
    getRecentRuns(supabase, user.id, 1),
    getRecommendations(supabase, user.id, { status: 'open', limit: 5 }),
  ])

  const latestRun = runs.find((r) => r.status === 'completed' && r.trigger_type === 'daily_digest')

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Copilote financier"
        subtitle="Briefing quotidien, recommandations et assistant conversationnel"
      />

      <DailyBriefingCard
        summary={latestRun?.summary ?? null}
        runDate={latestRun?.created_at}
      />

      <PendingConfirmationsBanner />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionBlock title="Nouvelle conversation" subtitle="Démarrer un échange avec le copilote.">
          <NewConversationButton />
        </SectionBlock>

        <SectionBlock title="Prompts rapides" subtitle="Démarrer une conversation avec une question.">
          <div className="flex flex-wrap gap-2">
            <QuickPromptButton prompt="Que faire aujourd'hui ?" />
            <QuickPromptButton prompt="Où est le risque principal ?" />
            <QuickPromptButton prompt="Puis-je retirer de l'argent en toute sécurité ?" />
            <QuickPromptButton prompt="Créer un sprint pour réduire les dettes en retard" />
          </div>
        </SectionBlock>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionBlock title="Conversations récentes" subtitle="Reprendre une discussion.">
          <ConversationList conversations={conversations} />
        </SectionBlock>

        <SectionBlock title="Recommandations ouvertes" subtitle="Actions proposées par le copilote.">
          {recommendations.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune recommandation ouverte.</p>
          ) : (
            <div className="space-y-2">
              {recommendations.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))}
            </div>
          )}
          <Link href="/app/assistant/recommendations" className="mt-2 inline-block text-sm text-amber-400 hover:text-amber-300">
            Voir toutes →
          </Link>
        </SectionBlock>
      </div>

      <div className="flex gap-4 text-sm text-zinc-500">
        <Link href="/app/assistant/memory" className="hover:text-zinc-300">
          Mémoire du copilote →
        </Link>
      </div>
    </div>
  )
}
