'use client'

import { useState } from 'react'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { AlertsList } from '@/modules/alerts/components/AlertsList'
import type { Alert } from '@/modules/alerts/types'
import type { AssistantConversation, AssistantRecommendation } from '@/modules/assistant/types'
import type { DailyPlanWithTasks } from '@/modules/planning/queries'
import type { Sprint } from '@/modules/sprints/types'
import type { GroupExecutionTasksDigest, GroupExplainPayload } from '../types'
import { ClickableMetricCard } from './ClickableMetricCard'
import { DataExplainDialog } from './DataExplainDialog'
import { GroupEntitiesSection, type EntityCardData } from './GroupEntitiesSection'
import { GroupQuickLinksBar } from './GroupQuickLinksBar'
import { GroupTasksSection } from './GroupTasksSection'
import { GroupCopilotSection } from './GroupCopilotSection'
import { GroupPlanningSnippet } from './GroupPlanningSnippet'
import { GroupSprintsSnippet } from './GroupSprintsSnippet'
import { Bell, Bot, Building2, Calendar, ListTodo } from 'lucide-react'

export interface GroupDashboardViewProps {
  groupName: string
  groupId?: string | null
  canManageCompanies?: boolean
  baseCurrency: string
  entitiesCount: number
  kpis: {
    openDebts: {
      value: string
      tone: 'neutral' | 'positive' | 'warning' | 'critical' | 'info'
      helper?: string
      explain: GroupExplainPayload
    }
    overdue: {
      value: string
      tone: 'neutral' | 'positive' | 'warning' | 'critical' | 'info'
      helper?: string
      explain: GroupExplainPayload
    }
    revenues: {
      value: string
      tone: 'neutral' | 'positive' | 'warning' | 'critical' | 'info'
      helper?: string
      explain: GroupExplainPayload
    }
    entities: {
      value: string
      tone: 'neutral' | 'positive' | 'warning' | 'critical' | 'info'
      helper?: string
      explain: GroupExplainPayload
    }
  }
  alertsBlock?: {
    critical: { value: string; explain: GroupExplainPayload }
    warnings: { value: string; explain: GroupExplainPayload }
    infos: { value: string; explain: GroupExplainPayload }
    list: Alert[]
  }
  entities: EntityCardData[]
  execution?: {
    tasks: GroupExecutionTasksDigest
    sprints: Sprint[]
    planDate: string
    plan: DailyPlanWithTasks | null
    recommendations: AssistantRecommendation[]
    latestConversation: AssistantConversation | null
  }
}

export function GroupDashboardView({
  groupName,
  groupId,
  canManageCompanies = false,
  baseCurrency,
  entitiesCount,
  kpis,
  alertsBlock,
  entities,
  execution,
}: GroupDashboardViewProps) {
  const [explain, setExplain] = useState<GroupExplainPayload | null>(null)
  const alertsCritical = Number(alertsBlock?.critical.value ?? '0') || 0
  const alertsWarnings = Number(alertsBlock?.warnings.value ?? '0') || 0
  const overdueCritical = kpis.overdue.tone === 'critical'
  const boardStatus: 'green' | 'amber' | 'red' =
    alertsCritical > 0 || overdueCritical ? 'red' : alertsWarnings > 0 ? 'amber' : 'green'

  const boardStatusLabel =
    boardStatus === 'red' ? 'Alerte élevée' : boardStatus === 'amber' ? 'Sous surveillance' : 'Stable'
  const boardStatusClass =
    boardStatus === 'red'
      ? 'border-red-800/60 bg-red-950/20 text-red-200'
      : boardStatus === 'amber'
        ? 'border-amber-800/60 bg-amber-950/20 text-amber-200'
        : 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200'

  const actionItems: string[] = []
  if (alertsCritical > 0) actionItems.push(`Traiter ${alertsCritical} alerte(s) critique(s) en priorité.`)
  if (Number(kpis.overdue.value.replace(/[^\d,-]/g, '').replace(',', '.')) > 0 || overdueCritical) {
    actionItems.push('Réduire immédiatement les encours en retard.')
  }
  if (execution && execution.tasks.counts.in_progress === 0 && execution.tasks.counts.todo > 0) {
    actionItems.push('Démarrer les tâches en attente pour relancer l’exécution.')
  }
  if (execution && execution.recommendations.length > 0) {
    actionItems.push(`Examiner ${execution.recommendations.length} recommandation(s) du copilote.`)
  }
  if (actionItems.length === 0) {
    actionItems.push('Maintenir le rythme actuel et surveiller les prochains jalons.')
  }
  const topActions = actionItems.slice(0, 3)
  const lastUpdate = new Date().toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const riskScore = boardStatus === 'red' ? 30 : boardStatus === 'amber' ? 60 : 85
  const executionScore = execution
    ? Math.min(100, Math.max(20, Math.round(((execution.tasks.counts.done + 1) / (execution.tasks.counts.open + execution.tasks.counts.done + 1)) * 100)))
    : 50
  const performanceScore = alertsWarnings > 0 ? 62 : 78
  const globalScore = Math.round((riskScore * 0.4) + (performanceScore * 0.3) + (executionScore * 0.3))

  function scoreClass(score: number) {
    if (score >= 75) return 'text-emerald-200'
    if (score >= 50) return 'text-amber-200'
    return 'text-red-200'
  }

  function axisBarClass(label: 'Risque' | 'Performance' | 'Exécution') {
    if (label === 'Risque') return 'bg-red-400'
    if (label === 'Performance') return 'bg-amber-400'
    return 'bg-emerald-400'
  }

  const scoreExplains: Record<'Risque' | 'Performance' | 'Exécution', GroupExplainPayload> = {
    Risque: {
      title: 'Score Risque',
      intro: 'Niveau de risque consolidé basé sur les alertes critiques et les retards.',
      formula: 'Base selon statut board (rouge/ambre/vert), ajustée par signaux d’alerte.',
      lines: [
        { label: 'Statut board', value: boardStatusLabel },
        { label: 'Alertes critiques', value: String(alertsCritical) },
        { label: 'Alertes avertissement', value: String(alertsWarnings) },
        { label: 'Score Risque', value: `${riskScore}/100` },
      ],
    },
    Performance: {
      title: 'Score Performance',
      intro: 'Indicateur de performance consolidée orienté stabilité et qualité opérationnelle.',
      formula: 'Valeur de référence ajustée selon pression d’alertes.',
      lines: [
        { label: 'Alertes avertissement', value: String(alertsWarnings) },
        { label: 'Score Performance', value: `${performanceScore}/100` },
      ],
    },
    Exécution: {
      title: 'Score Exécution',
      intro: 'Capacité à transformer le backlog en tâches terminées.',
      formula: 'done / (open + done) avec borne basse pour éviter les extrêmes.',
      lines: [
        { label: 'Tâches ouvertes', value: String(execution?.tasks.counts.open ?? 0) },
        { label: 'Tâches terminées', value: String(execution?.tasks.counts.done ?? 0) },
        { label: 'Score Exécution', value: `${executionScore}/100` },
      ],
    },
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title={groupName}
        subtitle={`Vue groupe · ${entitiesCount} entité${entitiesCount > 1 ? 's' : ''} · Consolidation ${baseCurrency}`}
      />
      <div className="flex justify-start">
        <UserGuidanceDialog
          title="Comment lire le dashboard groupe"
          description="Ce tableau consolide les entites du groupe pour prioriser les actions."
          entries={[
            { label: 'Dettes ouvertes / En retard', description: 'KPI consolides avec conversion en devise groupe.' },
            { label: 'Alertes', description: 'Signaux de risque classés par severite.' },
            { label: 'Entites', description: 'Vue detaillee par societe (dettes, revenus, equipe, comptes).' },
          ]}
          results={[
            { label: 'Score global', description: 'Synthese Risque + Performance + Execution.' },
            { label: 'Top 3 actions', description: 'Priorites immediates generees depuis les signaux du board.' },
            { label: 'Popup detail calcul', description: 'Cliquer sur un KPI pour voir origine et formule.' },
          ]}
        />
      </div>

      <GroupQuickLinksBar />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={`rounded-xl border p-4 xl:col-span-4 ${boardStatusClass}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em]">Score global</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-xl font-semibold">{boardStatusLabel}</p>
            <p className={`text-2xl font-bold ${scoreClass(globalScore)}`}>{globalScore}/100</p>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { label: 'Risque', value: riskScore },
              { label: 'Performance', value: performanceScore },
              { label: 'Exécution', value: executionScore },
            ].map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setExplain(scoreExplains[m.label as 'Risque' | 'Performance' | 'Exécution'])}
                    className="opacity-80 hover:opacity-100 hover:underline"
                  >
                    {m.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplain(scoreExplains[m.label as 'Risque' | 'Performance' | 'Exécution'])}
                    className="font-medium hover:underline"
                  >
                    {m.value}
                  </button>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setExplain(scoreExplains[m.label as 'Risque' | 'Performance' | 'Exécution'])}
                    className="h-full w-full"
                  >
                    <div
                      className={`h-full rounded-full ${axisBarClass(m.label as 'Risque' | 'Performance' | 'Exécution')}`}
                      style={{ width: `${m.value}%` }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-80">Dernière mise à jour: {lastUpdate}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 xl:col-span-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Top 3 actions maintenant
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-200">
            {topActions.map((action, idx) => (
              <li key={`${idx}-${action}`} className="flex items-start gap-2">
                <span className="mt-0.5 text-zinc-500">{idx + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ClickableMetricCard
          label="Dettes ouvertes"
          value={kpis.openDebts.value}
          tone={kpis.openDebts.tone}
          helper={kpis.openDebts.helper}
          trend="flat"
          trendLabel="Vue consolidée"
          explain={kpis.openDebts.explain}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="En retard"
          value={kpis.overdue.value}
          tone={kpis.overdue.tone}
          helper={kpis.overdue.helper}
          trend={kpis.overdue.tone === 'critical' ? 'up' : 'flat'}
          trendLabel={kpis.overdue.tone === 'critical' ? 'Vigilance élevée' : 'Sous contrôle'}
          explain={kpis.overdue.explain}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="Revenus attendus"
          value={kpis.revenues.value}
          tone={kpis.revenues.tone}
          helper={kpis.revenues.helper}
          trend="up"
          trendLabel="Pipeline actif"
          explain={kpis.revenues.explain}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="Entités actives"
          value={kpis.entities.value}
          tone={kpis.entities.tone}
          helper={kpis.entities.helper}
          trend="flat"
          trendLabel="Portefeuille consolidé"
          explain={kpis.entities.explain}
          onOpenExplain={setExplain}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {alertsBlock ? (
            <SectionBlock
              title="Centre d'alertes"
              subtitle="Les signaux les plus urgents du groupe apparaissent ici en priorité."
              icon={<Bell size={14} />}
              badge="Risque"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ClickableMetricCard
                  label="Critiques"
                  value={alertsBlock.critical.value}
                  tone="critical"
                  explain={alertsBlock.critical.explain}
                  onOpenExplain={setExplain}
                />
                <ClickableMetricCard
                  label="Avertissements"
                  value={alertsBlock.warnings.value}
                  tone="warning"
                  explain={alertsBlock.warnings.explain}
                  onOpenExplain={setExplain}
                />
                <ClickableMetricCard
                  label="Infos"
                  value={alertsBlock.infos.value}
                  tone="info"
                  explain={alertsBlock.infos.explain}
                  onOpenExplain={setExplain}
                />
              </div>
              <div className="mt-4">
                <AlertsList alerts={alertsBlock.list.slice(0, 3)} />
              </div>
            </SectionBlock>
          ) : null}

          <SectionBlock
            title="Entités"
            subtitle="Lecture rapide des sociétés consolidées."
            icon={<Building2 size={14} />}
            badge="Performance"
          >
            <GroupEntitiesSection
              entities={entities}
              onOpenExplain={setExplain}
              groupId={groupId ?? null}
              canManage={canManageCompanies}
            />
          </SectionBlock>
        </div>

        {execution ? (
          <div className="space-y-6 xl:col-span-4">
            <SectionBlock
              title="Tâches groupe"
              subtitle="Visibilité rapide du flux d'exécution."
              icon={<ListTodo size={14} />}
              badge="Execution"
            >
              <GroupTasksSection digest={execution.tasks} />
            </SectionBlock>

            <SectionBlock
              title="Copilote"
              subtitle="Recommandations ouvertes et dernier échange."
              icon={<Bot size={14} />}
              badge="Execution"
            >
              <GroupCopilotSection
                recommendations={execution.recommendations}
                latestConversation={execution.latestConversation}
              />
            </SectionBlock>

            <SectionBlock
              title="Plan du jour"
              subtitle="Les 3 priorités d'aujourd'hui."
              icon={<Calendar size={14} />}
              badge="Execution"
            >
              <GroupPlanningSnippet planDate={execution.planDate} plan={execution.plan} />
            </SectionBlock>

            <SectionBlock
              title="Sprints"
              subtitle="Sprints actifs et planifiés."
              icon={<Calendar size={14} />}
              badge="Execution"
            >
              <GroupSprintsSnippet sprints={execution.sprints} />
            </SectionBlock>
          </div>
        ) : null}
      </div>

      <DataExplainDialog open={explain !== null} onOpenChange={(o) => !o && setExplain(null)} payload={explain} />
    </div>
  )
}
