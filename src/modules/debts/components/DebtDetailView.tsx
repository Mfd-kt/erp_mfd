'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { DebtStatusBadge } from './DebtStatusBadge'
import { DebtPriorityBadge } from './DebtPriorityBadge'
import { DebtDrawer } from './DebtDrawer'
import { PaymentDrawer } from '@/modules/payments/components/PaymentDrawer'
import { PaymentsTable } from '@/modules/payments/components/PaymentsTable'
import type { DebtRow } from '../queries'
import type { PaymentWithAccount } from '@/modules/payments/queries'
import type { Company, Creditor, DebtCategory, DebtType, AccountWithBalance } from '@/lib/supabase/types'
import { ArrowLeft, Plus } from 'lucide-react'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

interface DebtDetailViewProps {
  companyId: string
  company: Company
  debt: DebtRow
  payments: PaymentWithAccount[]
  creditors: Creditor[]
  debtCategories: DebtCategory[]
  debtTypes: DebtType[]
  accounts: AccountWithBalance[]
  canManage: boolean
  initialOpenPayment?: boolean
}

export function DebtDetailView({
  companyId,
  company,
  debt,
  payments,
  creditors,
  debtCategories,
  debtTypes,
  accounts,
  canManage,
  initialOpenPayment = false,
}: DebtDetailViewProps) {
  const router = useRouter()
  const [debtDrawerOpen, setDebtDrawerOpen] = useState(false)
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(initialOpenPayment)
  const [editingPayment, setEditingPayment] = useState<PaymentWithAccount | null>(null)

  const remaining = Number(debt.remaining_company_currency)
  const paid = Number(debt.paid_company_currency ?? 0)

  function onSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <Link
          href={`/app/${companyId}/debts`}
          className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span className="sr-only">Retour aux dettes</span>
        </Link>
        <HeroPageHeader
          title={debt.title}
          subtitle={`${company.trade_name ?? company.legal_name} · Lecture complète de la dette, de son risque et de ses règlements.`}
          explain={KPI_EXPLAIN.pageDebtDetail()}
          rightSlot={canManage ? <Button className="bg-white text-zinc-950 hover:bg-zinc-200" onClick={() => setDebtDrawerOpen(true)}>Modifier la dette</Button> : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label="Montant total"
          value={formatCurrency(debt.amount_company_currency, company.default_currency)}
          tone="neutral"
          explain={KPI_EXPLAIN.debtDetailAmountTotal()}
        />
        <MetricCard
          label="Total payé"
          value={formatCurrency(paid, company.default_currency)}
          tone="positive"
          explain={KPI_EXPLAIN.debtDetailPaid()}
        />
        <MetricCard
          label="Restant dû"
          value={formatCurrency(remaining, company.default_currency)}
          tone={remaining > 0 ? 'critical' : 'neutral'}
          explain={KPI_EXPLAIN.debtDetailRemaining()}
        />
      </div>

      <SectionBlock title="Résumé" subtitle="Contexte, contrepartie et niveau d'urgence." explain={KPI_EXPLAIN.pageDebtDetail()}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm md:grid-cols-2">
          <div>
            <p className="section-label mb-1">Créancier</p>
            <p className="text-zinc-100">{debt.creditors?.name ?? '—'}</p>
          </div>
          <div>
            <p className="section-label mb-1">Catégorie</p>
            <p className="text-zinc-100">{debt.debt_categories?.name ?? '—'}</p>
          </div>
          <div>
            <p className="section-label mb-1">Échéance</p>
            <p className="text-zinc-100">{formatDate(debt.due_date)}</p>
          </div>
          <div>
            <p className="section-label mb-1">Survenance</p>
            <p className="text-zinc-100">{formatDate(debt.incurred_date)}</p>
          </div>
          <div>
            <p className="section-label mb-1">Priorité</p>
            <DebtPriorityBadge priority={debt.priority as import('@/lib/supabase/types').DebtPriority} />
          </div>
          <div>
            <p className="section-label mb-1">Statut</p>
            <DebtStatusBadge status={debt.computed_status as import('@/lib/supabase/types').DebtStatus} />
          </div>
        </div>
        {debt.notes ? (
          <div className="mt-6 border-t border-zinc-800/70 pt-4">
            <p className="section-label mb-2">Notes</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{debt.notes}</p>
          </div>
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Paiements"
        subtitle="Historique des règlements enregistrés sur cette dette."
        explain={KPI_EXPLAIN.debtDetailPaymentsSection()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div />
          {canManage && remaining > 0 ? (
            <Button
              size="sm"
              className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200"
              onClick={() => {
                setEditingPayment(null)
                setPaymentDrawerOpen(true)
              }}
            >
              <Plus size={14} />
              Ajouter un paiement
            </Button>
          ) : null}
        </div>
        <PaymentsTable
          payments={payments}
          defaultCurrency={company.default_currency}
          canManage={canManage}
          onEditPayment={(p) => {
            setEditingPayment(p)
            setPaymentDrawerOpen(true)
          }}
        />
      </SectionBlock>

      <DebtDrawer
        companyId={companyId}
        debt={debt}
        creditors={creditors}
        debtCategories={debtCategories}
        debtTypes={debtTypes}
        open={debtDrawerOpen}
        onOpenChange={setDebtDrawerOpen}
        onSuccess={onSuccess}
        onRefresh={onSuccess}
      />

      <PaymentDrawer
        companyId={companyId}
        debtId={debt.id}
        debtCurrency={debt.currency_code}
        capCurrency={company.default_currency}
        remainingAmount={
          editingPayment
            ? remaining + Number(editingPayment.amount_company_currency)
            : remaining
        }
        initialAmount={editingPayment ? undefined : remaining}
        accounts={accounts}
        open={paymentDrawerOpen}
        onOpenChange={(open) => {
          setPaymentDrawerOpen(open)
          if (!open) setEditingPayment(null)
        }}
        onSuccess={onSuccess}
        editingPayment={editingPayment}
      />
    </div>
  )
}
