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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/70">
            {['Titre', 'Créancier', 'Catégorie', 'Montant', 'Restant', 'Échéance', 'Priorité', 'Statut'].map((h) => (
              <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {h}
              </th>
            ))}
            {canManage && (
              <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Actions
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
                <tr className="bg-zinc-900/60">
                  <td
                    colSpan={canManage ? 9 : 8}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300"
                  >
                    {group.creditorLabel} · {group.rows.length} dette
                    {group.rows.length > 1 ? 's' : ''} · Restant total{' '}
                    {formatCurrency(groupRemaining, defaultCurrency)}
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
  )
}
