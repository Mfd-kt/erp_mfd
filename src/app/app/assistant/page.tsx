import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { generateDailyBriefing } from '@/features/copilot/briefing'
import { CopilotExecutivePanel } from '@/features/copilot/components/CopilotExecutivePanel'
import { getConversations, getRecentRuns, getRecommendations } from '@/modules/assistant/queries'
import { DailyBriefingCard } from '@/modules/assistant/components/DailyBriefingCard'
import { ConversationList } from '@/modules/assistant/components/ConversationList'
import { PendingConfirmationsBanner } from '@/modules/assistant/components/PendingConfirmationsBanner'
import { RecommendationCard } from '@/modules/assistant/components/RecommendationCard'
import { QuickPromptButton } from '@/modules/assistant/components/QuickPromptButton'
import { NewConversationButton } from '@/modules/assistant/components/NewConversationButton'
import { Heart, Compass, Scale, ListChecks } from 'lucide-react'

const ROLE_CARDS = [
  {
    icon: Heart,
    title: 'Confiance',
    text: 'Reformuler, désamorcer le flou, puis ancrer dans tes chiffres réels.',
  },
  {
    icon: Compass,
    title: 'Conseiller',
    text: 'Arbitrages, scénarios, priorités sur 24 h à 30 jours.',
  },
  {
    icon: Scale,
    title: 'Rigueur risque',
    text: 'Exposer ce qui peut mal tourner pour décider sans angle mort.',
  },
  {
    icon: ListChecks,
    title: 'Coach',
    text: 'Découper en étapes vérifiables et critères de succès.',
  },
] as const

export default async function AssistantPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const scope = await getAccessScope()

  const [conversations, runs, recommendations, executiveBriefing] = await Promise.all([
    getConversations(supabase, user.id, { status: 'active', limit: 10 }),
    getRecentRuns(supabase, user.id, 1),
    getRecommendations(supabase, user.id, { status: 'open', limit: 5 }),
    scope
      ? generateDailyBriefing({
          supabase,
          userId: user.id,
          companies: scope.companies,
          baseCurrency: scope.group?.base_currency ?? 'EUR',
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  const latestRun = runs.find((r) => r.status === 'completed' && r.trigger_type === 'daily_digest')

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/70 via-zinc-950 to-black/80 px-5 py-7 sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-500/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-violet-500/[0.05] blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <HeroPageHeader
            title="Copilote financier"
            subtitle="Un interlocuteur qui combine écoute, stratégie, rigueur sur les risques et plan d’exécution — pas seulement une lecture de tableaux."
          />
        </div>
      </section>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Comment j&apos;interviens</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLE_CARDS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 shadow-sm transition-colors hover:border-amber-500/20 hover:bg-zinc-900/40"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 transition-colors group-hover:border-amber-500/35 group-hover:bg-amber-500/[0.15]">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_min(100%,380px)] lg:items-start">
        <div className="order-2 space-y-8 lg:order-1">
          <PendingConfirmationsBanner />

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionBlock
              title="Nouvelle conversation"
              subtitle="Échange libre : analyse, scénarios, plan détaillé ou aide en cas de blocage."
            >
              <NewConversationButton />
            </SectionBlock>

            <SectionBlock
              title="Prompts rapides"
              subtitle="Chaque prompt demande une réponse structurée ; le copilote utilise les outils ERP."
            >
              <div className="grid gap-2 sm:grid-cols-1">
                <QuickPromptButton
                  label="Bilan & angles morts"
                  prompt={`Utilise les outils (notamment get_full_global_context et le périmètre). Réponds avec :
1) Constat factuel de ma situation
2) Les 3 risques les moins visibles mais les plus importants
3) Pour chaque risque : impact possible et signal précoce
4) Un plan de 5 actions priorisées sur 14 jours avec étapes concrètes et critères de réussite.`}
                />
                <QuickPromptButton
                  label="Plan d'action 7 jours"
                  prompt={`Avec les données ERP disponibles via les outils, propose un plan d'exécution sur 7 jours pour sécuriser la trésorerie et réduire l'urgence : au plus une grosse action par jour, chaque jour avec sous-étapes, critère de réussite, et ce que je sacrifie si je ne retiens qu'une seule priorité.`}
                />
                <QuickPromptButton
                  label="Trésorerie : que faire maintenant"
                  prompt={`Diagnostic trésorerie immédiat via les outils : liquidités, dettes en retard, encaissements attendus, marge de manœuvre. Puis 3 scénarios (pessimiste / central / favorable) avec hypothèses explicites. Termine par 3 décisions concrètes à prendre dans les 48h.`}
                />
                <QuickPromptButton
                  label="Je me sens bloqué"
                  prompt={`Je me sens bloqué face à mes finances. Reformule ce que tu comprends de ma situation avec les données disponibles, puis enchaîne : conseiller (2 à 3 options réalistes), rigueur risque (downside de chaque option), coach (3 micro-actions dans les 24h). Va en profondeur, ne reste pas en surface.`}
                />
                <QuickPromptButton
                  label="Stratégie 30 jours"
                  prompt={`Propose une stratégie financière et opérationnelle sur 30 jours : objectifs, jalons par semaine, 3 métriques à suivre, risques principaux, et ce qu'il faut volontairement ne pas faire pour tenir le cap. Appuie-toi sur les outils.`}
                />
                <QuickPromptButton
                  label="Retrait & sécurité cash"
                  prompt={`Puis-je retirer de l'argent en sécurité ? Vérifie via les outils : prévision de trésorerie, marge de sécurité, dettes en retard, revenus attendus. Réponds de façon nuancée : oui / non / sous conditions, avec les éléments chiffrés disponibles et les limites de ce que tu peux affirmer.`}
                />
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
              <Link
                href="/app/assistant/recommendations"
                className="mt-3 inline-flex items-center gap-1 text-sm text-amber-400/95 hover:text-amber-300"
              >
                Voir toutes
                <span aria-hidden>→</span>
              </Link>
            </SectionBlock>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-zinc-800/80 pt-6 text-sm text-zinc-500">
            <Link href="/app/assistant/learned" className="hover:text-zinc-300">
              Ce que le copilote a appris →
            </Link>
            <Link href="/app/assistant/memory" className="hover:text-zinc-300">
              Mémoire legacy (clé/valeur) →
            </Link>
          </div>
        </div>

        <aside className="order-1 space-y-4 lg:sticky lg:top-6 lg:order-2">
          <CopilotExecutivePanel briefing={executiveBriefing} />
          <DailyBriefingCard summary={latestRun?.summary ?? null} runDate={latestRun?.created_at} />
        </aside>
      </div>
    </div>
  )
}
