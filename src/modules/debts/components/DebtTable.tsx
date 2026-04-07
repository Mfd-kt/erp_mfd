'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { DebtStatusBadge } from './DebtStatusBadge'
import { DebtPriorityBadge } from './DebtPriorityBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { DebtRow } from '../queries'
import type { DebtStatus, DebtPriority } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'
import { deleteDebt } from '../actions'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

interface DebtTableProps {
  companyId: string
  debts: DebtRow[]
  defaultCurrency: string
  canManage: boolean
  onEdit: (debt: DebtRow) => void
  onSuccess: () => void
  onCreate?: () => void
}

export function DebtTable({ companyId, debts, defaultCurrency, canManage, onEdit, onSuccess, onCreate }: DebtTableProps) {
  if (!debts.length) {
    return (
      <EmptyState
        title="Aucune dette"
        description="Commence par créer une première dette pour suivre tes obligations et prioriser les échéances."
        actionLabel={canManage ? 'Créer une dette' : undefined}
        onAction={canManage ? onCreate : undefined}
      />
    )
  }

  const groupedDebts = debts.reduce<Record<string, { creditorLabel: string; rows: DebtRow[] }>>(
    (acc, debt) => {
      const key = debt.creditor_id ?? `unknown:${debt.creditors?.name ?? '—'}`
      if (!acc[key]) {
        acc[key] = {
          creditorLabel: debt.creditors?.name ?? 'Sans créancier',
          rows: [],
        }
      }
      acc[key].rows.push(debt)
      return acc
    },
    {}
  )

  const groups = Object.values(groupedDebts)

  const headers: { label: string; hint: string; align?: 'right' }[] = [
    { label: 'Titre', hint: 'Libellé de l’obligation — clique pour ouvrir le détail.' },
    { label: 'Créancier', hint: 'Contrepartie de la dette.' },
    { label: 'Catégorie', hint: 'Classification comptable / métier.' },
    { label: 'Montant', hint: 'Montant initial de la dette en devise société.', align: 'right' },
    { label: 'Restant', hint: 'Encours encore dû (après paiements partiels).', align: 'right' },
    { label: 'Échéance', hint: 'Date limite de paiement ; en rouge si dépassée.' },
    { label: 'Priorité', hint: 'Niveau d’urgence pour le pilotage.' },
    { label: 'Statut', hint: 'Ouverte, partiel, payée, en retard, etc.' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5 text-xs text-zinc-400">
        <p className="font-medium text-zinc-300">Légende des colonnes</p>
        <span>
          <span className="text-zinc-500">Montant</span> = obligation initiale ·{' '}
          <span className="text-zinc-500">Restant</span> = à payer aujourd’hui
        </span>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span>Les bandeaux foncés = sous-total par créancier (plusieurs dettes regroupées).</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Liste des dettes regroupées par créancier, avec montants, restants, échéances et statuts.
          </caption>
          <thead>
            <tr className="border-b border-zinc-800/70">
              {headers.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  title={h.hint}
                  className={`px-4 py-3 text-left align-bottom text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 ${h.align === 'right' ? 'text-right' : ''}`}
                >
                  <span className="block">{h.label}</span>
                  <span className="mt-1 hidden max-w-[11rem] text-[10px] font-normal normal-case tracking-normal text-zinc-600 md:block md:max-w-none">
                    {h.hint}
                  </span>
                </th>
              ))}
              {canManage && (
                <th
                  scope="col"
                  className="px-4 py-3 text-right align-bottom text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500"
                >
                  <span className="block">Actions</span>
                  <span className="mt-1 hidden text-[10px] font-normal normal-case tracking-normal text-zinc-600 md:block">
                    Payer, modifier, supprimer
                  </span>
                </th>
              )}
            </tr>
          </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {groups.map((group) => {
            const groupRemaining = group.rows.reduce(
              (sum, row) => sum + Number(row.remaining_company_currency),
              0
            )
            return (
              <Fragment key={`group-${group.creditorLabel}`}>
                <tr className="border-l-2 border-amber-500/50 bg-zinc-900/70">
                  <td colSpan={canManage ? 9 : 8} className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                        Créancier · {group.creditorLabel}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {group.rows.length} dette{group.rows.length > 1 ? 's' : ''} dans ce groupe
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-100">
                      Total restant à payer pour ce créancier :{' '}
                      <span className="font-mono tabular-nums">{formatCurrency(groupRemaining, defaultCurrency)}</span>
                    </p>
                  </td>
                </tr>
                {group.rows.map((debt) => {
                  const status = debt.computed_status as DebtStatus
                  const priority = debt.priority as DebtPriority
                  const isPaid = status === 'paid' || status === 'cancelled'
                  const isOverdue = status === 'overdue' && !isPaid
                  const categoryName = debt.debt_categories?.name ?? '—'
                  return (
                    <tr key={debt.id} className={`transition-colors hover:bg-zinc-900/70 ${isPaid ? 'opacity-60' : ''} ${isOverdue ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-4">
                        <Link href={`/app/${companyId}/debts/${debt.id}`} className="font-medium text-zinc-100 transition-colors hover:text-white">
                          {debt.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-zinc-400">{debt.creditors?.name ?? '—'}</td>
                      <td className="px-4 py-4 text-zinc-400">{categoryName}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">
                        {formatCurrency(debt.amount_company_currency, defaultCurrency)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-semibold text-white">
                        {formatCurrency(Number(debt.remaining_company_currency), defaultCurrency)}
                      </td>
                      <td className="px-4 py-4 text-zinc-400">
                        <span className={isOverdue ? 'text-red-400' : ''}>{formatDate(debt.due_date)}</span>
                      </td>
                      <td className="px-4 py-4"><DebtPriorityBadge priority={priority} /></td>
                      <td className="px-4 py-4"><DebtStatusBadge status={status} /></td>
                      {canManage && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                              render={<Link href={`/app/${companyId}/debts/${debt.id}?action=pay`} />}
                            >
                              Payer
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => onEdit(debt)}>
                              <Pencil size={14} />
                              <span className="sr-only">Modifier</span>
                            </Button>
                            <DeleteButton
                              description="Supprimer cette dette ? Les paiements associés doivent déjà être supprimés."
                              onConfirm={async () => {
                                await deleteDebt(companyId, debt.id)
                                onSuccess()
                              }}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}
