'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { Button } from '@/components/ui/button'
import { DebtFilters } from './DebtFilters'
import { DebtTable } from './DebtTable'
import { DebtDrawer } from './DebtDrawer'
import type { DebtRow } from '../queries'
import type { Company, Creditor, DebtCategory, DebtType } from '@/lib/supabase/types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

interface DebtsViewProps {
  companyId: string
  company: Company
  debts: DebtRow[]
  creditors: Creditor[]
  debtCategories: DebtCategory[]
  debtTypes: DebtType[]
  canManage: boolean
  kpis: {
    totalOpen: number
    totalOverdue: number
    openCount: number
    criticalCount: number
  }
  openCreateOnMount?: boolean
  statusMode?: 'active' | 'archived' | 'all'
  title?: string
  subtitle?: string
  kpiLabels?: {
    totalOpen?: string
    totalOverdue?: string
    openCount?: string
    criticalCount?: string
  }
}

export function DebtsView({
  companyId,
  company,
  debts,
  creditors,
  debtCategories,
  debtTypes,
  canManage,
  kpis,
  openCreateOnMount = false,
  statusMode = 'active',
  title = 'Dettes',
  subtitle,
  kpiLabels,
}: DebtsViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<DebtRow | null>(null)

  useEffect(() => {
    if (openCreateOnMount && canManage) {
      setEditingDebt(null)
      setDrawerOpen(true)
    }
  }, [openCreateOnMount, canManage])

  function openCreate() {
    setEditingDebt(null)
    setDrawerOpen(true)
  }

  function openEdit(debt: DebtRow) {
    setEditingDebt(debt)
    setDrawerOpen(true)
  }

  function onSuccess() {
    setDrawerOpen(false)
    setEditingDebt(null)
    router.refresh()
  }

  function onRefresh() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title={title}
        subtitle={
          subtitle ??
          `${company.trade_name ?? company.legal_name} · Pilotage des obligations, priorités et échéances.`
        }
        explain={KPI_EXPLAIN.pageDebts()}
        rightSlot={
          <div className="flex items-center gap-2">
            <UserGuidanceDialog
              title="Comment lire la page Dettes"
              description="Repere rapide pour comprendre les champs et les KPI."
              entries={[
                { label: 'Nouvelle dette', description: 'Ajoute une obligation avec montant, echeance et priorite.' },
                { label: 'Filtres', description: 'Affinent la liste par statut, priorite, creancier ou categorie.' },
              ]}
              results={[
                { label: 'Total ouvert', description: 'Somme des restants dus encore actifs.' },
                { label: 'En retard', description: 'Sous-ensemble avec echeance depassee.' },
                { label: 'Critiques', description: 'Dettes ouvertes jugees les plus urgentes.' },
              ]}
            />
            {canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouvelle dette</Button> : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={kpiLabels?.totalOpen ?? 'Total ouvert'}
          value={formatCurrency(kpis.totalOpen, company.default_currency)}
          tone="neutral"
          explain={KPI_EXPLAIN.debtsTotalOpen()}
        />
        <MetricCard
          label={kpiLabels?.totalOverdue ?? 'En retard'}
          value={formatCurrency(kpis.totalOverdue, company.default_currency)}
          tone="critical"
          explain={KPI_EXPLAIN.debtsTotalOverdue()}
        />
        <MetricCard
          label={kpiLabels?.openCount ?? 'Dettes ouvertes'}
          value={String(kpis.openCount)}
          tone="warning"
          explain={KPI_EXPLAIN.debtsOpenCount()}
        />
        <MetricCard
          label={kpiLabels?.criticalCount ?? 'Critiques'}
          value={String(kpis.criticalCount)}
          tone="critical"
          explain={KPI_EXPLAIN.debtsCriticalCount()}
        />
      </div>

      <SectionBlock title="Filtres" subtitle="Affiner la lecture par statut, priorité, créancier ou catégorie.">
        <Suspense fallback={<div className="h-10 rounded-xl bg-zinc-900 animate-pulse" />}>
          <DebtFilters creditors={creditors} debtCategories={debtCategories} statusMode={statusMode} />
        </Suspense>
      </SectionBlock>

      <SectionBlock title="Registre des dettes" subtitle="Montants restants, échéances et niveau d'urgence visibles d'un coup d'oeil.">
        <DebtTable companyId={companyId} debts={debts} defaultCurrency={company.default_currency} canManage={canManage} onEdit={openEdit} onSuccess={onSuccess} onCreate={openCreate} />
      </SectionBlock>

      <DebtDrawer
        companyId={companyId}
        debt={editingDebt}
        creditors={creditors}
        debtCategories={debtCategories}
        debtTypes={debtTypes}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={onSuccess}
        onRefresh={onRefresh}
      />
    </div>
  )
}
