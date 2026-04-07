'use client'

import Link from 'next/link'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PaymentWithAccount, PaymentRow } from '../queries'
import { Pencil } from 'lucide-react'

type PaymentTableRow = PaymentWithAccount | PaymentRow

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Virement',
  cash: 'Espèces',
  card: 'Carte',
  check: 'Chèque',
  other: 'Autre',
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR')
}

interface PaymentsTableProps {
  payments: PaymentTableRow[]
  defaultCurrency: string
  canManage?: boolean
  onEditPayment?: (p: PaymentWithAccount) => void
  emptyTitle?: string
  emptyDescription?: string
  /** Si défini, affiche une colonne « Dette » avec lien vers la fiche dette. */
  debtLinkCompanyId?: string
}

export function PaymentsTable({
  payments,
  defaultCurrency,
  canManage = false,
  onEditPayment,
  emptyTitle = 'Aucun paiement',
  emptyDescription = 'Aucun règlement n’a encore été enregistré pour cette dette.',
  debtLinkCompanyId,
}: PaymentsTableProps) {
  const showActions = Boolean(canManage && onEditPayment)

  if (!payments.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const headers = ['Date', 'Compte', 'Montant', 'Moyen', 'Référence', 'Notes']
  if (debtLinkCompanyId) headers.unshift('Dette')
  if (showActions) headers.push('')

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/70">
            {headers.map((h) => (
              <th
                key={h || 'actions'}
                className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {payments.map((p) => (
            <tr key={p.id} className="interactive-row">
              {debtLinkCompanyId && p.debt_id ? (
                <td className="max-w-[240px] px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/${debtLinkCompanyId}/debts/${p.debt_id}`}
                      className="font-medium text-zinc-200 transition-colors hover:text-white"
                    >
                      {(p as PaymentRow).debts?.title ?? (p as PaymentRow).debt?.title ?? '—'}
                    </Link>
                    {(p as PaymentRow).debts?.is_recurring_instance ||
                    (p as PaymentRow).debt?.is_recurring_instance ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-violet-500/40 bg-violet-500/10 text-[10px] uppercase tracking-wide text-violet-300"
                      >
                        Dette récurrente
                      </Badge>
                    ) : null}
                  </div>
                </td>
              ) : debtLinkCompanyId ? (
                <td className="px-4 py-4 text-zinc-500">—</td>
              ) : null}
              <td className="px-4 py-4 text-zinc-300">{formatDate(p.payment_date)}</td>
              <td className="px-4 py-4 text-zinc-400">
                {(p as PaymentWithAccount).accounts?.name ?? (p as PaymentWithAccount).account?.name ?? '—'}
              </td>
              <td className="px-4 py-4 text-right font-mono font-semibold text-zinc-100">
                {formatCurrency(p.amount_company_currency, defaultCurrency)}
              </td>
              <td className="px-4 py-4 text-zinc-400">
                {PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method ?? '—'}
              </td>
              <td className="px-4 py-4 text-zinc-400">{p.reference ?? '—'}</td>
              <td className="max-w-[220px] px-4 py-4 text-zinc-500 truncate">{p.notes ?? '—'}</td>
              {showActions ? (
                <td className="px-4 py-4 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                    aria-label="Modifier le paiement"
                    onClick={() => onEditPayment?.(p)}
                  >
                    <Pencil size={16} />
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
