'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { PaymentDrawer } from './PaymentDrawer'
import type { PaymentRow } from '../queries'
import type { Company, AccountWithBalance } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'

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

interface PaymentsViewProps {
  companyId: string
  company: Company
  payments: PaymentRow[]
  kpis: {
    totalThisMonth: number
    totalLastMonth: number
    count: number
  }
  accounts: AccountWithBalance[]
  canManage: boolean
  debtRemainingByDebtId: Record<string, number>
}

export function PaymentsView({
  companyId,
  company,
  payments,
  kpis,
  accounts,
  canManage,
  debtRemainingByDebtId,
}: PaymentsViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null)

  function onSuccess() {
    router.refresh()
  }

  const editingHeadroom =
    editingPayment?.debt_id != null
      ? (debtRemainingByDebtId[editingPayment.debt_id] ?? 0) +
        Number(editingPayment.amount_company_currency ?? 0)
      : 0

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Paiements"
        subtitle={`${company.trade_name ?? company.legal_name} · Historique des règlements enregistrés.`}
        explain={KPI_EXPLAIN.pagePayments()}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ce mois"
          value={formatCurrency(kpis.totalThisMonth, company.default_currency)}
          tone="neutral"
          explain={KPI_EXPLAIN.paymentsThisMonth()}
        />
        <MetricCard
          label="Mois dernier"
          value={formatCurrency(kpis.totalLastMonth, company.default_currency)}
          tone="neutral"
          explain={KPI_EXPLAIN.paymentsLastMonth()}
        />
        <MetricCard
          label="Total paiements"
          value={String(kpis.count)}
          tone="info"
          explain={KPI_EXPLAIN.paymentsCount()}
        />
      </div>

      <SectionBlock
        title="Registre des paiements"
        subtitle="Tous les règlements enregistrés. Vous pouvez modifier un paiement depuis ce tableau ou depuis la page de la dette concernée."
      >
        {payments.length === 0 ? (
          <EmptyState
            title="Aucun paiement"
            description="Aucun règlement n'a encore été enregistré. Les paiements se créent depuis la page Dettes en ouvrant une dette."
            actionLabel="Voir les dettes"
            onAction={() => router.push(`/app/${companyId}/debts`)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Date', 'Dette', 'Compte', 'Montant', 'Moyen', 'Référence', ...(canManage ? [''] : [])].map((h) => (
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
                    <td className="px-4 py-4 text-zinc-300">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-4">
                      {p.debt_id ? (
                        <Link
                          href={`/app/${companyId}/debts/${p.debt_id}`}
                          className="text-amber-400 hover:text-amber-300"
                        >
                          {(p as PaymentRow).debts?.title ?? (p as PaymentRow).debt?.title ?? '—'}
                        </Link>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {(p as PaymentRow).accounts?.name ?? (p as PaymentRow).account?.name ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-semibold text-zinc-100">
                      {formatCurrency(p.amount_company_currency, company.default_currency)}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{p.reference ?? '—'}</td>
                    {canManage && p.debt_id ? (
                      <td className="px-4 py-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                          aria-label="Modifier le paiement"
                          onClick={() => {
                            setEditingPayment(p)
                            setDrawerOpen(true)
                          }}
                        >
                          <Pencil size={16} />
                        </Button>
                      </td>
                    ) : canManage ? (
                      <td className="px-4 py-4 text-zinc-600">—</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      {canManage && editingPayment?.debt_id && accounts.length > 0 ? (
        <PaymentDrawer
          companyId={companyId}
          debtId={editingPayment.debt_id}
          debtCurrency={editingPayment.currency_code}
          capCurrency={company.default_currency}
          remainingAmount={editingHeadroom}
          accounts={accounts}
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open)
            if (!open) setEditingPayment(null)
          }}
          onSuccess={onSuccess}
          editingPayment={editingPayment}
        />
      ) : null}
    </div>
  )
}
