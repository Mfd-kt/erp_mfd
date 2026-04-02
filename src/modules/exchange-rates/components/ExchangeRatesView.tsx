'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { ExchangeRateDrawer } from './ExchangeRateDrawer'
import { deleteExchangeRate } from '../actions'
import type { ExchangeRate } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR')
}

interface ExchangeRatesViewProps {
  groupId: string
  baseCurrency: string
  rates: ExchangeRate[]
  canManage: boolean
}

export function ExchangeRatesView({ groupId, baseCurrency, rates, canManage }: ExchangeRatesViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ExchangeRate | null>(null)

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }
  function openEdit(row: ExchangeRate) {
    setEditing(row)
    setDrawerOpen(true)
  }
  function onSuccess() {
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteExchangeRate(groupId, id)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Taux de change"
        subtitle={`Taux utilisés pour convertir les montants entre devises (prévision groupe, contrôle global, analytique). Devise de référence du groupe : ${baseCurrency}.`}
        rightSlot={
          canManage ? (
            <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">
              Nouveau taux
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard label="Taux enregistrés" value={String(rates.length)} tone="neutral" />
        <MetricCard label="Devise groupe" value={baseCurrency} tone="info" />
      </div>

      <SectionBlock
        title="Registre des taux"
        subtitle="Une ligne par paire et par date d’effet. Pour une date donnée, le moteur prend le dernier taux avec date ≤ date demandée."
      >
        {rates.length === 0 ? (
          <EmptyState
            title="Aucun taux"
            description="Ajoutez au moins les conversions entre la devise du groupe et les devises des sociétés pour une consolidation fiable."
            actionLabel={canManage ? 'Ajouter un taux' : undefined}
            onAction={canManage ? openCreate : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Depuis', 'Vers', 'Taux', 'Date d’effet', ...(canManage ? [''] : [])].map((h) => (
                    <th
                      key={h || 'a'}
                      className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {rates.map((r) => (
                  <tr key={r.id} className="interactive-row">
                    <td className="px-4 py-4 font-mono text-zinc-200">{r.from_currency}</td>
                    <td className="px-4 py-4 font-mono text-zinc-200">{r.to_currency}</td>
                    <td className="px-4 py-4 font-mono text-zinc-100">{Number(r.rate).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-4 text-zinc-400">{formatDate(r.rate_date)}</td>
                    {canManage ? (
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            onClick={() => openEdit(r)}
                            aria-label="Modifier"
                          >
                            <Pencil size={14} />
                          </Button>
                          <DeleteButton
                            description="Ce taux sera supprimé. Les prévisions et consolidations utiliseront un autre enregistrement ou signaleront un taux manquant."
                            onConfirm={() => handleDelete(r.id)}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      {canManage ? (
        <ExchangeRateDrawer
          groupId={groupId}
          baseCurrency={baseCurrency}
          rate={editing}
          open={drawerOpen}
          onOpenChange={(o) => {
            setDrawerOpen(o)
            if (!o) setEditing(null)
          }}
          onSuccess={onSuccess}
        />
      ) : null}
    </div>
  )
}
