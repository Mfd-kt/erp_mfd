'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { Button } from '@/components/ui/button'
import { RevenueFilters } from './RevenueFilters'
import { RevenueTable } from './RevenueTable'
import { RevenueDrawer } from './RevenueDrawer'
import type { RevenueRow } from '../queries'
import type { Company, RevenueClient } from '@/lib/supabase/types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

interface RevenuesViewProps {
  companyId: string
  company: Company
  revenues: RevenueRow[]
  revenueClients: RevenueClient[]
  canManage: boolean
  kpis?: {
    totalExpected: number
    totalReceived: number
    expectedThisMonth: number
    receivedThisMonth: number
  }
  openCreateOnMount?: boolean
}

export function RevenuesView({
  companyId,
  company,
  revenues,
  revenueClients,
  canManage,
  kpis,
  openCreateOnMount = false,
}: RevenuesViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRevenue, setEditingRevenue] = useState<RevenueRow | null>(null)

  useEffect(() => {
    if (openCreateOnMount && canManage) {
      setEditingRevenue(null)
      setDrawerOpen(true)
    }
  }, [openCreateOnMount, canManage])

  function openCreate() {
    setEditingRevenue(null)
    setDrawerOpen(true)
  }

  function openEdit(revenue: RevenueRow) {
    setEditingRevenue(revenue)
    setDrawerOpen(true)
  }

  function onSuccess() {
    setDrawerOpen(false)
    setEditingRevenue(null)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Revenus"
        subtitle={`${company.trade_name ?? company.legal_name} · Encaissements attendus, reçus et restant à sécuriser.`}
        explain={KPI_EXPLAIN.pageRevenues()}
        rightSlot={
          <div className="flex items-center gap-2">
            <UserGuidanceDialog
              title="Comment lire la page Revenus"
              description="Aide rapide pour la saisie et l interpretation des chiffres."
              entries={[
                { label: 'Nouveau revenu', description: 'Cree une ligne de revenu attendu (pipeline futur).' },
                { label: 'Filtres', description: 'Restreignent la vue par statut et dates attendues.' },
              ]}
              results={[
                { label: 'Total attendu', description: 'Projection des encaissements a venir.' },
                { label: 'Total recu', description: 'Montants deja encaisses.' },
                { label: 'Ce mois', description: 'Focus operationnel sur la periode en cours.' },
              ]}
            />
            {canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouveau revenu</Button> : null}
          </div>
        }
      />

      {kpis ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total attendu"
            value={formatCurrency(kpis.totalExpected, company.default_currency)}
            tone="info"
            explain={KPI_EXPLAIN.revenuesTotalExpected()}
          />
          <MetricCard
            label="Total reçu"
            value={formatCurrency(kpis.totalReceived, company.default_currency)}
            tone="positive"
            explain={KPI_EXPLAIN.revenuesTotalReceived()}
          />
          <MetricCard
            label="Attendus ce mois"
            value={formatCurrency(kpis.expectedThisMonth, company.default_currency)}
            tone="neutral"
            explain={KPI_EXPLAIN.revenuesExpectedThisMonth()}
          />
          <MetricCard
            label="Reçus ce mois"
            value={formatCurrency(kpis.receivedThisMonth, company.default_currency)}
            tone="positive"
            explain={KPI_EXPLAIN.revenuesReceivedThisMonth()}
          />
        </div>
      ) : null}

      <SectionBlock title="Filtres" subtitle="Filtrer par statut et fenêtre de dates attendues.">
        <Suspense fallback={<div className="h-10 rounded-xl bg-zinc-900 animate-pulse" />}>
          <RevenueFilters revenueClients={revenueClients} />
        </Suspense>
      </SectionBlock>

      <SectionBlock title="Pipeline de revenus" subtitle="Montants attendus, encaissés et restant à recevoir dans une vue unique.">
        <RevenueTable companyId={companyId} revenues={revenues} defaultCurrency={company.default_currency} canManage={canManage} onEdit={openEdit} onSuccess={onSuccess} onCreate={openCreate} />
      </SectionBlock>

      <RevenueDrawer
        companyId={companyId}
        revenue={editingRevenue}
        revenueClients={revenueClients}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={onSuccess}
      />
    </div>
  )
}
