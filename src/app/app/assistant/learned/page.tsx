import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { generateDailyBriefing } from '@/features/copilot/briefing'
import { getOrCreateProfile } from '@/features/copilot/profile'
import { listMemoryForUser } from '@/features/copilot/memory'
import { listSignalsForUser } from '@/features/copilot/signals'
import { getRecommendationStatsForUser } from '@/features/copilot/recommendations'
import { listAgentActionLogsRecent, listRecentFeedbackEvents } from '@/features/copilot/repository'
import { listRecentDecisions } from '@/features/copilot/decisions'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { CopilotCoherenceCard } from '@/features/copilot/components/CopilotCoherenceCard'
import { CopilotMemoryListClient } from '@/features/copilot/components/CopilotMemoryListClient'
import { CopilotAddMemoryForm } from '@/features/copilot/components/CopilotAddMemoryForm'
import { CopilotProfileFormClient } from '@/features/copilot/components/CopilotProfileFormClient'
import { isSyntheticCopilotProfile } from '@/features/copilot/schema-availability'
import { probeCopilotUserProfileAccess } from '@/features/copilot/schema-probe'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function CopilotLearnedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const scope = await getAccessScope()

  const [profileInitial, memories, signals, stats, events, briefing, decisions, agentLogs, probe] =
    await Promise.all([
      getOrCreateProfile(supabase, user.id),
      listMemoryForUser(supabase, user.id),
      listSignalsForUser(supabase, user.id),
      getRecommendationStatsForUser(supabase, user.id),
      listRecentFeedbackEvents(supabase, user.id, 25),
      scope
        ? generateDailyBriefing({
            supabase,
            userId: user.id,
            companies: scope.companies,
            baseCurrency: scope.group?.base_currency ?? 'EUR',
          }).catch(() => null)
        : Promise.resolve(null),
      listRecentDecisions(supabase, user.id, 20),
      listAgentActionLogsRecent(supabase, user.id, 25),
      probeCopilotUserProfileAccess(supabase),
    ])

  /** Si la table est visible pour un SELECT mais l’upsert a échoué (ex. cache), un second essai suffit souvent. */
  let profile = profileInitial
  if (isSyntheticCopilotProfile(profile) && probe.ok) {
    profile = await getOrCreateProfile(supabase, user.id)
  }

  const schemaMissing = isSyntheticCopilotProfile(profile)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Ce que le copilote a appris"
        subtitle="Mémoire explicite, profil éditable, signaux et traçabilité — pas d’apprentissage opaque."
      />

      {schemaMissing ? (
        <Card className="border-amber-800/60 bg-amber-950/25">
          <CardContent className="p-4 text-sm text-amber-100/95">
            <p className="font-medium">L’app ne voit pas encore les tables copilot</p>
            {!probe.ok ? (
              <div className="mt-3 rounded-lg border border-amber-700/50 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-amber-100/95">
                <p className="mb-1 font-sans text-xs font-medium text-amber-200">Réponse exacte de l’API (à comparer avec le SQL Editor) :</p>
                {probe.code ? <p>code: {probe.code}</p> : null}
                <p className="break-words whitespace-pre-wrap">{probe.message}</p>
                {probe.message?.toLowerCase().includes('jwt') || probe.message?.toLowerCase().includes('api key') ? (
                  <p className="mt-2 font-sans text-amber-200/90">
                    Indice : la clé <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> doit venir du{' '}
                    <strong>même</strong> projet que l’URL (Settings → API dans Supabase).
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-amber-200/80">
                La lecture de <code className="rounded bg-black/30 px-1">copilot_user_profile</code> réussit, mais la création du
                profil a échoué. Regarde le terminal serveur (log <code className="rounded bg-black/30 px-1">[copilot]</code>) ou
                vérifie les politiques RLS / contraintes sur cette table.
              </p>
            )}
            <p className="mt-2 text-amber-200/80">
              Tant que Supabase renvoie une erreur du type « table introuvable » ou « schema cache » sur{' '}
              <code className="rounded bg-black/30 px-1">copilot_user_profile</code>, l’interface reste en mode dégradé.
            </p>
            <p className="mt-3 text-amber-200/85">
              <span className="font-medium text-amber-100">Si tu as déjà exécuté le SQL</span>, vérifie dans l’ordre :
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-amber-200/85">
              <li>
                Même projet que l’app : dans le dashboard Supabase (Settings → API), l’URL du projet doit être identique à{' '}
                <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> dans ton{' '}
                <code className="rounded bg-black/30 px-1">.env.local</code>.
              </li>
              <li>
                Dans le <strong>SQL Editor du même projet</strong>, exécute :{' '}
                <code className="break-all rounded bg-black/30 px-1">SELECT 1 FROM public.copilot_user_profile LIMIT 1;</code>
                — si ça échoue, les tables ne sont pas sur ce projet ou le schéma n’est pas <code className="rounded bg-black/30 px-1">public</code>.
              </li>
              <li>
                Rafraîchir le cache API PostgREST :{' '}
                <code className="break-all rounded bg-black/30 px-1">NOTIFY pgrst, &apos;reload schema&apos;;</code> puis recharge la page (parfois nécessaire juste après création des tables).
              </li>
            </ol>
            <p className="mt-3 text-xs text-amber-200/70">
              Première install : fichier{' '}
              <code className="rounded bg-black/30 px-1">supabase/migrations/20260331130000_copilot_memory_system.sql</code> puis les
              migrations suivantes (<code className="rounded bg-black/30 px-1">…140000…</code>, <code className="rounded bg-black/30 px-1">…150000…</code>), ou{' '}
              <code className="rounded bg-black/30 px-1">npx supabase db push</code> lié à ce projet.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <CopilotCoherenceCard stats={stats} />

      <SectionBlock
        title="Pilotage exécutif"
        subtitle="Score de discipline, mode crise et posture — calculs serveur explicites."
      >
        {briefing ? (
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
            <p className="text-zinc-200">
              Discipline <span className="font-semibold tabular-nums">{briefing.discipline.score}</span>/100 ({briefing.discipline.level}) · risque{' '}
              {briefing.overallRiskLevel}
            </p>
            <p className="text-xs text-zinc-500">
              Mode crise : {briefing.crisisMode.isCrisisMode ? `oui (${briefing.crisisMode.severity})` : 'non'} — score{' '}
              {briefing.crisisMode.scoreTotal} — posture {briefing.crisisMode.recommendedPosture}
            </p>
            <p className="text-xs text-zinc-400">{briefing.disciplineSummary}</p>
            <ul className="mt-2 space-y-1 text-[11px] text-zinc-600">
              {Object.entries(briefing.discipline.factors).map(([k, f]) => (
                <li key={k}>
                  <span className="font-mono text-zinc-500">{k}</span> — {f.label}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Finance agrégée ({briefing.baseCurrency})</p>
              <p className="mt-1">
                Cash {briefing.financialSnapshot.availableCash == null ? '—' : briefing.financialSnapshot.availableCash.toFixed(0)} · net
                7j {briefing.financialSnapshot.forecastNet7Days == null ? '—' : briefing.financialSnapshot.forecastNet7Days.toFixed(0)}
                {briefing.financialSnapshot.fxIncomplete ? ' · FX incomplet' : ''}
              </p>
            </div>
            {briefing.discipline.insights.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs text-zinc-500">
                {briefing.discipline.insights.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Indisponible (migrations ou périmètre société).</p>
        )}
      </SectionBlock>

      <SectionBlock
        title="Décisions récentes (recommandations)"
        subtitle="Accepté / rejeté / reporté — traçabilité copilot_decisions."
      >
        {decisions.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune décision enregistrée.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto text-xs text-zinc-400">
            {decisions.map((d) => (
              <li key={d.id} className="rounded border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5 font-mono">
                {new Date(d.decided_at).toLocaleString('fr-FR')} — {d.decision_type}
                {d.executed ? ' · exécuté' : ''}
                {d.recommendation_id ? ` · reco ${d.recommendation_id.slice(0, 8)}…` : ''}
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>

      <SectionBlock
        title="Journal actions agent (executor)"
        subtitle="Tentatives d’exécution internes — succès, bloqué, erreur."
      >
        {agentLogs.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune entrée.</p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto font-mono text-[11px] text-zinc-500">
            {agentLogs.map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString('fr-FR')} — {a.action_type} — {a.result_status}
                {a.error_code ? ` — ${a.error_code}` : ''}
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>

      <SectionBlock
        title="Profil & préférences"
        subtitle="Résumé libre, focus dominant, style : utilisé pour enrichir le prompt (tu peux corriger à tout moment)."
      >
        <CopilotProfileFormClient
          disabled={schemaMissing}
          initial={{
            profile_summary: profile.profile_summary,
            dominant_focus: profile.dominant_focus,
            preferred_output_style: profile.preferred_output_style,
            estimated_risk_tolerance: profile.estimated_risk_tolerance,
            decision_style: profile.decision_style,
            recurring_topics: profile.recurring_topics,
            recurring_biases: profile.recurring_biases,
            strong_patterns: profile.strong_patterns,
          }}
        />
      </SectionBlock>

      <SectionBlock
        title="Mémoire active (structurée)"
        subtitle="Entrées utilisées quand elles sont pertinentes pour ta requête. Désactiver = ne plus injecter (la ligne reste en base désactivée)."
      >
        <CopilotMemoryListClient items={memories} disableActions={schemaMissing} />
        <CopilotAddMemoryForm disabled={schemaMissing} />
      </SectionBlock>

      <SectionBlock title="Signaux comportementaux" subtitle="Règles serveur explicites (répétitions, volume de recos ouvertes, etc.).">
        {signals.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun signal actif pour l’instant.</p>
        ) : (
          <ul className="space-y-3">
            {signals.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300"
              >
                <span className="text-xs uppercase tracking-wide text-amber-500/90">{s.severity}</span>
                <p className="mt-1">{s.description}</p>
                <p className="mt-1 font-mono text-[10px] text-zinc-600">{s.signal_type}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>

      <SectionBlock title="Événements récents (traçabilité)" subtitle="Feedback explicite sur recommandations et mémoire.">
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun événement enregistré.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-[11px] text-zinc-500">
            {events.map((e) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString('fr-FR')} — {e.feedback_type}
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>

      <p className="text-sm text-zinc-500">
        <Link href="/app/assistant" className="hover:text-zinc-300">
          ← Retour au copilote
        </Link>
      </p>
    </div>
  )
}
