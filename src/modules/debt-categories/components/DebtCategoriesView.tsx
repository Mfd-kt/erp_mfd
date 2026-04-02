'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DebtCategoryDrawer } from './DebtCategoryDrawer'
import { deleteDebtCategory, getDebtCategoryUsage, reassignAndDeleteDebtCategory } from '../actions'
import type { DebtCategory, DebtType, Company } from '@/lib/supabase/types'
import { Pencil, Trash2 } from 'lucide-react'

interface DebtCategoryRow extends DebtCategory { debt_types?: DebtType | null; debt_type?: DebtType | null }
interface DebtCategoriesViewProps { companyId: string; company: Company; debtTypes: DebtType[]; debtCategories: DebtCategoryRow[]; canManage: boolean }

export function DebtCategoriesView({ companyId, company, debtTypes, debtCategories, canManage }: DebtCategoriesViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DebtCategoryRow | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<DebtCategoryRow | null>(null)
  const [replacementCategoryId, setReplacementCategoryId] = useState('')
  const [usage, setUsage] = useState<{ debtsCount: number; rulesCount: number } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()
  const activeDebtTypeId = searchParams?.get('debt_type_id') ?? ''
  function openCreate() { setEditingCategory(null); setDrawerOpen(true) }
  function openEdit(dc: DebtCategoryRow) { setEditingCategory(dc); setDrawerOpen(true) }
  function onSuccess() { router.refresh() }

  function updateTypeFilter(value: string) {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) next.set('debt_type_id', value)
    else next.delete('debt_type_id')
    const q = next.toString()
    router.push(q ? `${pathname}?${q}` : pathname ?? '/')
  }

  function openDeleteDialog(dc: DebtCategoryRow) {
    setDeletingCategory(dc)
    setReplacementCategoryId('')
    setUsage(null)
    setDeleteError(null)
    setDeleteDialogOpen(true)
    void (async () => {
      try {
        const usageData = await getDebtCategoryUsage(companyId, dc.id)
        setUsage(usageData)
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Erreur')
      }
    })()
  }

  function confirmDelete() {
    if (!deletingCategory) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      try {
        const hasLinks = (usage?.debtsCount ?? 0) > 0 || (usage?.rulesCount ?? 0) > 0
        if (hasLinks) {
          if (!replacementCategoryId) {
            throw new Error('Choisis une catégorie de remplacement.')
          }
          await reassignAndDeleteDebtCategory(
            companyId,
            deletingCategory.id,
            replacementCategoryId
          )
        } else {
          await deleteDebtCategory(companyId, deletingCategory.id)
        }
        setDeleteDialogOpen(false)
        setDeletingCategory(null)
        router.refresh()
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Catégories de dette"
        subtitle={`${company.trade_name ?? company.legal_name} · Classification fine des obligations et dépenses récurrentes.`}
        explain={KPI_EXPLAIN.referentialList('Catégories de dette')}
        rightSlot={canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouvelle catégorie</Button> : undefined}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Catégories" value={String(debtCategories.length)} tone="neutral" explain={KPI_EXPLAIN.debtCategoriesTotal()} />
        <MetricCard label="Paie" value={String(debtCategories.filter((c) => c.is_payroll).length)} tone="warning" explain={KPI_EXPLAIN.debtCategoriesPayroll()} />
        <MetricCard
          label="Récurrentes"
          value={String(debtCategories.filter((c) => c.is_recurring_default).length)}
          tone="info"
          explain={KPI_EXPLAIN.debtCategoriesRecurring()}
        />
      </div>
      <SectionBlock
        title="Référentiel"
        subtitle="Catégories utilisables dans les dettes et les règles récurrentes."
        explain={KPI_EXPLAIN.referentialList('Catégories de dette')}
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={activeDebtTypeId}
            onChange={(e) => updateTypeFilter(e.target.value)}
            className="h-10 min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700"
          >
            <option value="">Tous les types</option>
            {debtTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.code} — {dt.name}
              </option>
            ))}
          </select>
          {activeDebtTypeId ? (
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              onClick={() => updateTypeFilter('')}
            >
              Réinitialiser filtre
            </Button>
          ) : null}
        </div>
        {debtCategories.length === 0 ? (
          <EmptyState title="Aucune catégorie" description="Crée d'abord un type de dette, puis une première catégorie métier comme Loyer, Salaire ou Fiscalité." actionLabel={canManage ? 'Créer une catégorie' : undefined} onAction={canManage ? openCreate : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800/70">{['Code', 'Nom', 'Type', 'Description', 'Paie', 'Récurrent'].map((h) => <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{h}</th>)}{canManage && <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>}</tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {debtCategories.map((dc) => {
                  const dt = dc.debt_types ?? dc.debt_type
                  return (
                    <tr key={dc.id} className="transition-colors hover:bg-zinc-900/70">
                      <td className="px-4 py-4 font-mono text-zinc-200">{dc.code}</td>
                      <td className="px-4 py-4 font-medium text-zinc-100">{dc.name}</td>
                      <td className="px-4 py-4 text-zinc-400">{dt ? `${dt.code} — ${dt.name}` : '—'}</td>
                      <td className="px-4 py-4 text-zinc-400">{dc.description ?? '—'}</td>
                      <td className="px-4 py-4">{dc.is_payroll ? <Badge variant="secondary" className="bg-amber-500/15 text-amber-300">Oui</Badge> : <span className="text-zinc-500">—</span>}</td>
                      <td className="px-4 py-4">{dc.is_recurring_default ? <Badge variant="outline" className="border-zinc-700 text-zinc-300">Oui</Badge> : <span className="text-zinc-500">—</span>}</td>
                      {canManage && <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => openEdit(dc)}><Pencil size={14} /></Button><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/30" onClick={() => openDeleteDialog(dc)}><Trash2 size={14} /><span className="sr-only">Supprimer</span></Button></div></td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
      <DebtCategoryDrawer companyId={companyId} debtTypes={debtTypes} debtCategory={editingCategory} open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={onSuccess} onRefresh={() => router.refresh()} />
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {deletingCategory
                ? `Catégorie: ${deletingCategory.name}`
                : 'Choisis comment traiter les éléments liés avant suppression.'}
            </DialogDescription>
          </DialogHeader>
          {usage && (usage.debtsCount > 0 || usage.rulesCount > 0) ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                Cette catégorie est liée à <strong>{usage.debtsCount}</strong> dette(s) et{' '}
                <strong>{usage.rulesCount}</strong> règle(s) récurrente(s).
              </p>
              <p className="text-sm text-zinc-400">
                Choisis une catégorie de remplacement. Les dettes et règles liées seront
                réaffectées automatiquement, puis la catégorie sera supprimée.
              </p>
              <select
                value={replacementCategoryId}
                onChange={(e) => setReplacementCategoryId(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700"
              >
                <option value="">Sélectionner une catégorie de remplacement...</option>
                {debtCategories
                  .filter((c) => c.id !== deletingCategory?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : usage ? (
            <p className="text-sm text-zinc-300">
              Aucune dette ni règle récurrente liée. Cette catégorie peut être supprimée
              directement.
            </p>
          ) : (
            <p className="text-sm text-zinc-400">Analyse des liens en cours...</p>
          )}
          {deleteError ? (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-md px-3 py-2">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletePending}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeletePending || !usage}>
              {isDeletePending ? 'Traitement...' : 'Réaffecter et supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
