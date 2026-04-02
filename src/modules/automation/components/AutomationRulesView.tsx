'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { MetricCard } from '@/components/ui/metric-card'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import { deleteAutomationRule } from '../actions'
import { summarizeAction, summarizeConditions, TRIGGER_LABELS } from '../queries'
import { AutomationRuleDrawer } from './AutomationRuleDrawer'
import { DeleteButton } from '@/components/shared/DeleteButton'

interface Props {
  companyId: string
  companyName: string
  rules: any[]
}

export function AutomationRulesView({ companyId, companyName, rules }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  function createNew() { setEditing(null); setOpen(true) }
  function editRule(rule: any) { setEditing(rule); setOpen(true) }
  function onSuccess() { setOpen(false); setEditing(null); router.refresh() }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Automations"
        subtitle={`${companyName} · Règles actives reliant événements métier et actions automatiques.`}
        explain={KPI_EXPLAIN.pageAutomations()}
        rightSlot={<Button onClick={createNew} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouvelle règle</Button>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Règles" value={String(rules.length)} tone="neutral" explain={KPI_EXPLAIN.automationRulesTotal()} />
        <MetricCard
          label="Actives"
          value={String(rules.filter((r) => r.is_active).length)}
          tone="positive"
          explain={KPI_EXPLAIN.automationRulesActiveCount()}
        />
        <MetricCard
          label="Déclencheurs distincts"
          value={String(new Set(rules.map((r) => r.trigger_type)).size)}
          tone="info"
          explain={KPI_EXPLAIN.automationTriggersDistinct()}
        />
      </div>
      <SectionBlock title="Règles" subtitle="Déclencheurs, conditions et actions résumés en langage métier." explain={KPI_EXPLAIN.pageAutomations()}>
        {!rules.length ? (
          <EmptyState title="Aucune règle" description="Crée une règle pour déclencher automatiquement notifications, alertes ou webhooks." actionLabel="Créer une règle" onAction={createNew} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Nom', 'Déclencheur', 'Statut', 'Conditions', 'Action'].map((h) => <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{h}</th>)}
                  <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {rules.map((rule) => (
                  <tr key={rule.id} className="interactive-row">
                    <td className="px-4 py-4 font-medium text-zinc-100">{rule.name}</td>
                    <td className="px-4 py-4 text-zinc-300">{TRIGGER_LABELS[rule.trigger_type] ?? rule.trigger_type}</td>
                    <td className="px-4 py-4 text-zinc-400">{rule.is_active ? 'Actif' : 'Inactif'}</td>
                    <td className="px-4 py-4 text-zinc-400">{summarizeConditions(rule.condition_json)}</td>
                    <td className="px-4 py-4 text-zinc-400">{summarizeAction(rule.action_json)}</td>
                    <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => editRule(rule)}>Modifier</Button><DeleteButton description="Supprimer cette règle d'automatisation ?" onConfirm={() => deleteAutomationRule(companyId, rule.id)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
      <AutomationRuleDrawer companyId={companyId} rule={editing} open={open} onOpenChange={setOpen} onSuccess={onSuccess} />
    </div>
  )
}
