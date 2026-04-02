'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { PaymentDrawer } from '@/modules/payments/components/PaymentDrawer'
import { ReceiveRevenueDrawer } from '@/modules/revenues/components/ReceiveRevenueDrawer'
import { RevenueDrawer } from '@/modules/revenues/components/RevenueDrawer'
import type { PaymentRow } from '@/modules/payments/queries'
import type { RevenueRow } from '@/modules/revenues/queries'
import type { DebtRow } from '@/modules/debts/queries'
import type { AccountWithBalance, Company, RevenueClient } from '@/lib/supabase/types'
import { ArrowLeft, MinusCircle, PlusCircle } from 'lucide-react'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR')
}

export type AccountTransaction =
  | {
      kind: 'payment'
      id: string
      date: string
      label: string
      amount: number
      currency: string
      debtId: string
    }
  | {
      kind: 'revenue'
      id: string
      date: string
      label: string
      amount: number
      currency: string
      revenueId: string
    }

function buildTransactions(payments: PaymentRow[], revenues: RevenueRow[]): AccountTransaction[] {
  const out: AccountTransaction[] = []
  for (const p of payments) {
    const debtTitle = (p as PaymentRow & { debts?: { title: string } | null }).debts?.title ?? 'Dette'
    out.push({
      kind: 'payment',
      id: p.id,
      date: p.payment_date.slice(0, 10),
      label: `Paiement — ${debtTitle}`,
      amount: Number(p.amount_company_currency ?? 0),
      currency: p.currency_code,
      debtId: p.debt_id ?? '',
    })
  }
  for (const r of revenues) {
    const amt = Number(r.amount_received) || 0
    if (amt <= 0) continue
    const d = r.received_date?.slice(0, 10) ?? r.expected_date?.slice(0, 10) ?? ''
    out.push({
      kind: 'revenue',
      id: r.id,
      date: d,
      label: `Encaissement — ${r.title}`,
      amount: amt,
      currency: r.currency_code,
      revenueId: r.id,
    })
  }
  out.sort((a, b) => b.date.localeCompare(a.date))
  return out
}

interface AccountDetailViewProps {
  companyId: string
  company: Company
  account: AccountWithBalance
  payments: PaymentRow[]
  revenueInflows: RevenueRow[]
  openDebts: DebtRow[]
  receivableRevenues: RevenueRow[]
  revenueClients: RevenueClient[]
  allAccounts: AccountWithBalance[]
  canManage: boolean
}

export function AccountDetailView({
  companyId,
  company,
  account,
  payments,
  revenueInflows,
  openDebts,
  receivableRevenues,
  revenueClients,
  allAccounts,
  canManage,
}: AccountDetailViewProps) {
  const router = useRouter()
  const balance = Number(account.computed_balance ?? account.opening_balance)

  const transactions = useMemo(() => buildTransactions(payments, revenueInflows), [payments, revenueInflows])

  const payableDebts = useMemo(
    () => openDebts.filter((d) => Number(d.remaining_company_currency) > 0.0001),
    [openDebts]
  )

  const [debtIdForPayment, setDebtIdForPayment] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)

  const [revenueIdForReceive, setRevenueIdForReceive] = useState('')
  const [receiveOpen, setReceiveOpen] = useState(false)

  const [revenueDrawerOpen, setRevenueDrawerOpen] = useState(false)

  const selectedDebt = payableDebts.find((d) => d.id === debtIdForPayment)
  const selectedRevenue = receivableRevenues.find((r) => r.id === revenueIdForReceive)

  const debtRemaining = selectedDebt ? Number(selectedDebt.remaining_company_currency) : 0
  const debtCurrency = selectedDebt?.currency_code ?? company.default_currency

  const expectedTotal = selectedRevenue ? Number(selectedRevenue.amount_expected) || 0 : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/app/${companyId}/accounts`}
            className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-400"
          >
            <ArrowLeft size={16} />
            Retour aux comptes
          </Link>
          <HeroPageHeader
            title={account.name}
            subtitle={`${company.trade_name ?? company.legal_name} · ${account.account_type} · ${account.currency_code}`}
            explain={KPI_EXPLAIN.pageAccountDetail()}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricCard
          label="Solde actuel"
          value={formatCurrency(balance, account.currency_code)}
          tone={balance < 0 ? 'critical' : 'positive'}
          explain={KPI_EXPLAIN.accountDetailBalance()}
        />
        <MetricCard
          label="Mouvements affichés"
          value={String(transactions.length)}
          tone="neutral"
          helper="Paiements et encaissements liés à ce compte"
          explain={KPI_EXPLAIN.accountDetailMovements()}
        />
      </div>

      {canManage ? (
        <SectionBlock
          title="Ajouter des mouvements"
          subtitle="Enregistrer un paiement sur une dette depuis ce compte, encaisser un revenu attendu, ou créer une nouvelle ligne de revenu."
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap">
            <div className="min-w-[260px] flex-1 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Paiement (sortie)</p>
              <select
                value={debtIdForPayment}
                onChange={(e) => setDebtIdForPayment(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                <option value="">Choisir une dette à régler…</option>
                {payableDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} — reste {Number(d.remaining_company_currency).toFixed(2)} {company.default_currency}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="w-full bg-white text-zinc-950 hover:bg-zinc-200"
                disabled={!debtIdForPayment}
                onClick={() => setPaymentOpen(true)}
              >
                <MinusCircle size={16} className="mr-2" />
                Enregistrer un paiement
              </Button>
            </div>

            <div className="min-w-[260px] flex-1 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Encaissement (entrée)</p>
              <select
                value={revenueIdForReceive}
                onChange={(e) => setRevenueIdForReceive(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                <option value="">Choisir un revenu à encaisser…</option>
                {receivableRevenues.map((r) => {
                  const exp = Number(r.amount_expected) || 0
                  const rec = Number(r.amount_received) || 0
                  const rest = exp - rec
                  return (
                    <option key={r.id} value={r.id}>
                      {r.title} — reste {rest.toFixed(2)} {r.currency_code}
                    </option>
                  )
                })}
              </select>
              <Button
                type="button"
                className="w-full border border-emerald-700/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50"
                disabled={!revenueIdForReceive || !selectedRevenue}
                onClick={() => setReceiveOpen(true)}
              >
                <PlusCircle size={16} className="mr-2" />
                Enregistrer l&apos;encaissement
              </Button>
            </div>

            <div className="min-w-[200px] flex flex-col justify-end">
              <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setRevenueDrawerOpen(true)}>
                Nouveau revenu attendu
              </Button>
            </div>
          </div>
        </SectionBlock>
      ) : null}

      <SectionBlock title="Transactions sur ce compte" subtitle="Historique des paiements et encaissements rattachés à ce support.">
        {transactions.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
            Aucun mouvement pour l’instant. Utilisez les actions ci-dessus ou enregistrez des paiements / réceptions depuis les écrans Dettes et Revenus.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">Libellé</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">Montant</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">Lien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transactions.map((t) => (
                  <tr key={`${t.kind}-${t.id}`} className="hover:bg-zinc-900/60">
                    <td className="px-4 py-3 font-mono text-zinc-400">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 text-zinc-200">{t.label}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${
                        t.kind === 'payment' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {t.kind === 'payment' ? '−' : '+'}
                      {formatCurrency(Math.abs(t.amount), t.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.kind === 'payment' ? (
                        <Link href={`/app/${companyId}/debts/${t.debtId}`} className="text-xs text-amber-400 hover:underline">
                          Voir la dette
                        </Link>
                      ) : (
                        <Link href={`/app/${companyId}/revenues/${t.revenueId}`} className="text-xs text-amber-400 hover:underline">
                          Voir le revenu
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      {selectedDebt && (
        <PaymentDrawer
          companyId={companyId}
          fixedAccountId={account.id}
          debtId={selectedDebt.id}
          debtCurrency={debtCurrency}
          capCurrency={company.default_currency}
          remainingAmount={debtRemaining}
          accounts={allAccounts.length ? allAccounts : [account]}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSuccess={() => {
            setPaymentOpen(false)
            router.refresh()
          }}
        />
      )}

      {selectedRevenue && (
        <ReceiveRevenueDrawer
          companyId={companyId}
          revenueId={selectedRevenue.id}
          amountExpected={expectedTotal}
          currency={selectedRevenue.currency_code}
          accounts={allAccounts.length ? allAccounts : [account]}
          defaultAccountId={account.id}
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          onSuccess={() => {
            setReceiveOpen(false)
            router.refresh()
          }}
        />
      )}

      <RevenueDrawer
        companyId={companyId}
        revenue={null}
        revenueClients={revenueClients}
        open={revenueDrawerOpen}
        onOpenChange={setRevenueDrawerOpen}
        onSuccess={() => {
          setRevenueDrawerOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
