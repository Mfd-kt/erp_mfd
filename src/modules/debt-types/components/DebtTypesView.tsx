'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { DebtTypeDrawer } from './DebtTypeDrawer'
import { deleteDebtType, getDebtTypeUsage, reassignAndDeleteDebtType } from '../actions'
import type { DebtType, Company } from '@/lib/supabase/types'
import { Pencil, Trash2 } from 'lucide-react'

interface DebtTypesViewProps { companyId: string; company: Company; debtTypes: DebtType[]; canManage: boolean }

export function DebtTypesView({ companyId, company, debtTypes, canManage }: DebtTypesViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingDebtType, setEditingDebtType] = useState<DebtType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDebtType, setDeletingDebtType] = useState<DebtType | null>(null)
  const [replacementDebtTypeId, setReplacementDebtTypeId] = useState('')
  const [usage, setUsage] = useState<{ categoriesCount: number } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()
  function openCreate() { setEditingDebtType(null); setDrawerOpen(true) }
  function openEdit(dt: DebtType) { setEditingDebtType(dt); setDrawerOpen(true) }
  function onSuccess() { router.refresh() }

  function openDeleteDialog(dt: DebtType) {
    setDeletingDebtType(dt)
    setReplacementDebtTypeId('')
    setUsage(null)
    setDeleteError(null)
    setDeleteDialogOpen(true)
    void (async () => {
      try {
        const usageData = await getDebtTypeUsage(companyId, dt.id)
        setUsage(usageData)
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Erreur')
      }
    })()
  }

  function confirmDelete() {
    if (!deletingDebtType) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      try {
        if ((usage?.categoriesCount ?? 0) > 0) {
          if (!replacementDebtTypeId) throw new Error('Choisis un type de remplacement.')
          await reassignAndDeleteDebtType(companyId, deletingDebtType.id, replacementDebtTypeId)
        } else {
          await deleteDebtType(companyId, deletingDebtType.id)
        }
        setDeleteDialogOpen(false)
        setDeletingDebtType(null)
        router.refresh()
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Types de dette"
        subtitle={`${company.trade_name ?? company.legal_name} · Macro-structure comptable des différentes familles d'obligations.`}
        explain={KPI_EXPLAIN.referentialList('Types de dette')}
        rightSlot={canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouveau type</Button> : undefined}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Types" value={String(debtTypes.length)} tone="neutral" explain={KPI_EXPLAIN.debtTypesTotal()} />
      </div>
      <SectionBlock
        title="Référentiel"
        subtitle="Types de dette de haut niveau utilisés par les catégories et la lecture analytique."
        explain={KPI_EXPLAIN.referentialList('Types de dette')}
      >
        {debtTypes.length === 0 ? (
          <EmptyState title="Aucun type de dette" description="Crée un premier type pour structurer les catégories, par exemple OPEX, Fiscal ou Personnel." actionLabel={canManage ? 'Créer un type' : undefined} onAction={canManage ? openCreate : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800/70">{['Code', 'Nom', 'Description'].map((h) => <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{h}</th>)}{canManage && <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>}</tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {debtTypes.map((dt) => (
                  <tr key={dt.id} className="transition-colors hover:bg-zinc-900/70">
                    <td className="px-4 py-4 font-mono text-zinc-200">{dt.code}</td>
                    <td className="px-4 py-4 font-medium text-zinc-100">{dt.name}</td>
                    <td className="px-4 py-4 text-zinc-400">{dt.description ?? '—'}</td>
                    {canManage && <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => openEdit(dt)}><Pencil size={14} /></Button><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/30" onClick={() => openDeleteDialog(dt)}><Trash2 size={14} /><span className="sr-only">Supprimer</span></Button></div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
      <DebtTypeDrawer companyId={companyId} debtType={editingDebtType} open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={onSuccess} />
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Supprimer le type de dette</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {deletingDebtType
                ? `Type: ${deletingDebtType.code} — ${deletingDebtType.name}`
                : 'Choisis comment traiter les catégories liées avant suppression.'}
            </DialogDescription>
          </DialogHeader>
          {usage && usage.categoriesCount > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                Ce type est lié à <strong>{usage.categoriesCount}</strong> catégorie(s).
              </p>
              <p className="text-sm text-zinc-400">
                Choisis un type de remplacement. Les catégories liées seront réaffectées
                automatiquement, puis le type sera supprimé.
              </p>
              <select
                value={replacementDebtTypeId}
                onChange={(e) => setReplacementDebtTypeId(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-zinc-700"
              >
                <option value="">Sélectionner un type de remplacement...</option>
                {debtTypes
                  .filter((dt) => dt.id !== deletingDebtType?.id)
                  .map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.code} — {dt.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : usage ? (
            <p className="text-sm text-zinc-300">
              Aucune catégorie liée. Ce type peut être supprimé directement.
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
