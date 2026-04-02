'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { CreditorDrawer } from './CreditorDrawer'
import { deleteCreditor } from '../actions'
import type { Creditor, Company } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'

const creditorTypeLabel: Record<string, string> = {
  person: 'Personne', company: 'Société', employee: 'Employé', government: 'Gouvernement', landlord: 'Propriétaire', bank: 'Banque', other: 'Autre',
}

interface CreditorsViewProps {
  companyId: string
  company: Company
  creditors: Creditor[]
  canManage: boolean
}

export function CreditorsView({ companyId, company, creditors, canManage }: CreditorsViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCreditor, setEditingCreditor] = useState<Creditor | null>(null)

  function openCreate() { setEditingCreditor(null); setDrawerOpen(true) }
  function openEdit(c: Creditor) { setEditingCreditor(c); setDrawerOpen(true) }
  function onSuccess() { router.refresh() }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Créanciers"
        subtitle={`${company.trade_name ?? company.legal_name} · Référentiel des contreparties financières de l'entreprise.`}
        explain={KPI_EXPLAIN.referentialList('Créanciers')}
        rightSlot={canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouveau créancier</Button> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Créanciers" value={String(creditors.length)} tone="neutral" explain={KPI_EXPLAIN.creditorsTotal()} />
        <MetricCard
          label="Sociétés"
          value={String(creditors.filter((c) => c.creditor_type === 'company').length)}
          tone="info"
          explain={KPI_EXPLAIN.creditorsByType('Société')}
        />
        <MetricCard
          label="Banques"
          value={String(creditors.filter((c) => c.creditor_type === 'bank').length)}
          tone="neutral"
          explain={KPI_EXPLAIN.creditorsByType('Banque')}
        />
      </div>

      <SectionBlock
        title="Référentiel"
        subtitle="Coordonnées et typologie des créanciers accessibles à toute l'équipe financière."
        explain={KPI_EXPLAIN.referentialList('Créanciers')}
      >
        {creditors.length === 0 ? (
          <EmptyState title="Aucun créancier" description="Ajoute un premier créancier pour structurer les dettes et paiements associés." actionLabel={canManage ? 'Créer un créancier' : undefined} onAction={canManage ? openCreate : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Nom', 'Type', 'Pays', 'Email', 'Téléphone'].map((h) => <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{h}</th>)}
                  {canManage && <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {creditors.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-zinc-900/70">
                    <td className="px-4 py-4 font-medium text-zinc-100">{c.name}</td>
                    <td className="px-4 py-4"><Badge variant="outline" className="border-zinc-700 text-zinc-300">{creditorTypeLabel[c.creditor_type] ?? c.creditor_type}</Badge></td>
                    <td className="px-4 py-4 text-zinc-400">{c.country_code ?? '—'}</td>
                    <td className="px-4 py-4 text-zinc-400">{c.email ?? '—'}</td>
                    <td className="px-4 py-4 text-zinc-400">{c.phone ?? '—'}</td>
                    {canManage && <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => openEdit(c)}><Pencil size={14} /></Button><DeleteButton description="Ce créancier sera supprimé. Les dettes liées ne seront pas supprimées." onConfirm={() => deleteCreditor(companyId, c.id)} /></div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      <CreditorDrawer companyId={companyId} creditor={editingCreditor} open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={onSuccess} />
    </div>
  )
}
