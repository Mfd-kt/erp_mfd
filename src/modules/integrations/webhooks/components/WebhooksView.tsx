'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { SectionBlock } from '@/components/ui/section-block'
import { MetricCard } from '@/components/ui/metric-card'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { deleteWebhook } from '../actions'
import { WebhookDrawer } from './WebhookDrawer'

interface Props {
  companyId: string
  companyName: string
  webhooks: any[]
}

export function WebhooksView({ companyId, companyName, webhooks }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  function createNew() { setEditing(null); setOpen(true) }
  function editWebhook(webhook: any) { setEditing(webhook); setOpen(true) }
  function onSuccess() { setOpen(false); setEditing(null); router.refresh() }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Webhooks"
        subtitle={`${companyName} · Connecter les événements ERP à tes systèmes externes.`}
        explain={KPI_EXPLAIN.pageWebhooks()}
        rightSlot={<Button onClick={createNew} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouveau webhook</Button>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Webhooks" value={String(webhooks.length)} tone="neutral" />
        <MetricCard label="Actifs" value={String(webhooks.filter((w) => w.is_active).length)} tone="positive" />
        <MetricCard label="Événements" value={String(new Set(webhooks.map((w) => w.event_type)).size)} tone="info" />
      </div>
      <SectionBlock title="Destinations" subtitle="Événements supportés : paiement créé, dette en retard, prévision négative.">
        {!webhooks.length ? (
          <EmptyState title="Aucun webhook" description="Ajoute une destination HTTP pour réagir automatiquement aux événements du système." actionLabel="Créer un webhook" onAction={createNew} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800/70">{['Événement', 'URL', 'Statut'].map((h) => <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{h}</th>)}<th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th></tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {webhooks.map((hook) => (
                  <tr key={hook.id} className="interactive-row">
                    <td className="px-4 py-4 text-zinc-100">{hook.event_type}</td>
                    <td className="px-4 py-4 text-zinc-400">{hook.url}</td>
                    <td className="px-4 py-4 text-zinc-400">{hook.is_active ? 'Actif' : 'Inactif'}</td>
                    <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => editWebhook(hook)}>Modifier</Button><DeleteButton description="Supprimer ce webhook ?" onConfirm={() => deleteWebhook(companyId, hook.id)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
      <WebhookDrawer companyId={companyId} webhook={editing} open={open} onOpenChange={setOpen} onSuccess={onSuccess} />
    </div>
  )
}
