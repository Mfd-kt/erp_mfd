'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
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
  /** Si les dettes sont filtrées par créancier (URL), lien vers la fiche PDF / impression. */
  filterCreditorId?: string
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
  filterCreditorId,
}: DebtsViewProps) {
  const router = useRouter()
  const filterCreditorName = filterCreditorId
    ? creditors.find((c) => c.id === filterCreditorId)?.name
    : undefined
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
          `${company.trade_name ?? company.legal_name} — Suivi des montants dus, des échéances et des priorités ; la liste ci-dessous est regroupée par créancier.`
        }
        explain={KPI_EXPLAIN.pageDebts()}
        rightSlot={
          <div className="flex items-center gap-2">
            <UserGuidanceDialog
              title="Comment lire la page Dettes"
              description="Vue d’ensemble des obligations : montants, échéances, et ce qui reste à payer."
              entries={[
                { label: 'Nouvelle dette', description: 'Crée une obligation avec montant, échéance, créancier et priorité.' },
                { label: 'Filtres', description: 'Raccourcis (En retard, À jour, etc.) et menus : statut, priorité, créancier, catégorie. L’URL garde ta sélection.' },
                { label: 'Groupement', description: 'Le tableau regroupe les lignes par créancier pour totaliser le restant par interlocuteur.' },
              ]}
              results={[
                { label: 'Total ouvert', description: 'Somme des restants dus sur toutes les dettes encore actives (hors payées / annulées selon l’onglet).' },
                { label: 'En retard', description: 'Partie du restant dont la date d’échéance est dépassée.' },
                { label: 'Montant vs restant', description: 'Montant = obligation initiale. Restant = ce qu’il reste à payer aujourd’hui (après paiements partiels).' },
                { label: 'Critiques', description: 'Nombre de dettes ouvertes marquées priorité critique.' },
              ]}
            />
            {canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouvelle dette</Button> : null}
          </div>
        }
      />

      {filterCreditorId ? (
        <div className="no-print flex flex-col gap-3 rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-200">
            Filtre créancier :{' '}
            <span className="font-semibold text-white">{filterCreditorName ?? '—'}</span> — pour imprimer ou partager un PDF avec
            en-tête société, ouvre la fiche créancier.
          </p>
          <Button
            variant="default"
            className="shrink-0 bg-white text-zinc-950 hover:bg-zinc-200"
            render={<Link href={`/app/${companyId}/creditors/${filterCreditorId}`} />}
          >
            Fiche créancier (PDF)
          </Button>
        </div>
      ) : null}

      <section
        className="rounded-xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 px-4 py-4 sm:px-5"
        aria-labelledby="debts-quick-read-title"
      >
        <h2 id="debts-quick-read-title" className="text-sm font-semibold text-zinc-100">
          Lecture rapide
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
            <span>
              <strong className="font-medium text-zinc-300">KPI du haut</strong> — « Total ouvert » = tout ce qu’il reste à payer sur les dettes actives ; « En retard » = partie dont l’échéance est passée ; les deux derniers comptent les lignes (ouvertes / critiques).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
            <span>
              <strong className="font-medium text-zinc-300">Tableau</strong> — les dettes sont{' '}
              <strong className="font-medium text-zinc-300">regroupées par créancier</strong> : chaque bandeau résume le nombre de dettes et le{' '}
              <strong className="font-medium text-zinc-300">total restant</strong> pour ce créancier.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
            <span>
              <strong className="font-medium text-zinc-300">Colonnes</strong> — « Montant » = montant initial de la dette ; « Restant » = encore dû après paiements partiels. La ligne en rouge indique une échéance dépassée.
            </span>
          </li>
        </ul>
      </section>

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

      <SectionBlock
        title="Filtres"
        subtitle="Affine la liste ci-dessous. Chaque choix met à jour l’adresse (tu peux partager ou marquer un lien)."
      >
        <Suspense fallback={<div className="h-10 rounded-xl bg-zinc-900 animate-pulse" />}>
          <DebtFilters creditors={creditors} debtCategories={debtCategories} statusMode={statusMode} />
        </Suspense>
      </SectionBlock>

      <SectionBlock
        title="Registre des dettes"
        subtitle="Une ligne = une obligation. Les bandeaux gris regroupent les dettes par créancier (total restant pour ce créancier)."
      >
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
