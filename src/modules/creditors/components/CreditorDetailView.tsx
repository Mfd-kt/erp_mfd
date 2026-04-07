'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DebtDrawer } from '@/modules/debts/components/DebtDrawer'
import { DebtStatusBadge } from '@/modules/debts/components/DebtStatusBadge'
import { DebtPriorityBadge } from '@/modules/debts/components/DebtPriorityBadge'
import { PaymentDrawer } from '@/modules/payments/components/PaymentDrawer'
import { PaymentsTable } from '@/modules/payments/components/PaymentsTable'
import { RecurringFrequencyBadge } from '@/modules/recurring-rules/components/RecurringFrequencyBadge'
import type { DebtRow } from '@/modules/debts/queries'
import type { PaymentRow } from '@/modules/payments/queries'
import type { RecurringRuleRow } from '@/modules/recurring-rules/types'
import type {
  AccountWithBalance,
  Company,
  Creditor,
  DebtCategory,
  DebtPriority,
  DebtStatus,
  DebtType,
  FrequencyType,
} from '@/lib/supabase/types'
import { creditorCountryDisplay, getCreditorCompanyLines } from '@/modules/creditors/creditor-company-lines'
import { CreditorDrawer } from '@/modules/creditors/components/CreditorDrawer'
import { CreditorPdfTemplate } from '@/modules/creditors/components/CreditorPdfTemplate'
import { PDF_A4_PAGE_PX, renderCreditorPdfSinglePageBlob } from '@/lib/creditor-pdf-single-page'
import { creditorPdfDomIds, creditorPdfFilename } from '@/lib/creditor-print-pdf'
import { ArrowLeft, FileText, Pencil, Plus, Printer, Share2 } from 'lucide-react'

const creditorTypeLabel: Record<string, string> = {
  person: 'Personne',
  company: 'Société',
  employee: 'Employé',
  government: 'Gouvernement',
  landlord: 'Propriétaire',
  bank: 'Banque',
  other: 'Autre',
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

interface CreditorDetailViewProps {
  companyId: string
  company: Company
  creditor: Creditor
  debts: DebtRow[]
  payments: PaymentRow[]
  recurringRules: RecurringRuleRow[]
  creditors: Creditor[]
  debtCategories: DebtCategory[]
  debtTypes: DebtType[]
  accounts: AccountWithBalance[]
  canManage: boolean
}

export function CreditorDetailView({
  companyId,
  company,
  creditor,
  debts,
  payments,
  recurringRules,
  creditors,
  debtCategories,
  debtTypes,
  accounts,
  canManage,
}: CreditorDetailViewProps) {
  const router = useRouter()
  const currency = company.default_currency
  const totalAmount = debts.reduce((s, d) => s + Number(d.amount_company_currency), 0)
  const totalPaid = debts.reduce((s, d) => s + Number(d.paid_company_currency ?? 0), 0)
  const totalRemaining = debts.reduce((s, d) => s + Number(d.remaining_company_currency), 0)

  const printRef = useRef<HTMLDivElement>(null)
  const pdfBusyRef = useRef(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  const [creditorEditOpen, setCreditorEditOpen] = useState(false)
  const [debtDrawerOpen, setDebtDrawerOpen] = useState(false)
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
  const [debtPickerOpen, setDebtPickerOpen] = useState(false)
  const [paymentTargetDebt, setPaymentTargetDebt] = useState<DebtRow | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null)
  const [paymentHint, setPaymentHint] = useState<string | null>(null)

  const payableDebts = useMemo(
    () => debts.filter((d) => Number(d.remaining_company_currency) > 0),
    [debts],
  )

  const companyDisplay = company.trade_name ?? company.legal_name

  function refreshPage() {
    router.refresh()
  }

  function pickDebtForPayment(debt: DebtRow) {
    setDebtPickerOpen(false)
    setPaymentHint(null)
    setEditingPayment(null)
    setPaymentTargetDebt(debt)
    setPaymentDrawerOpen(true)
  }

  function openAddPayment() {
    if (payableDebts.length === 0) {
      setPaymentHint(
        'Aucune dette avec un restant à payer pour ce créancier. Créez une dette ou ouvrez une dette existante.',
      )
      return
    }
    setPaymentHint(null)
    if (payableDebts.length === 1) {
      pickDebtForPayment(payableDebts[0])
    } else {
      setDebtPickerOpen(true)
    }
  }

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleSharePdf = useCallback(async () => {
    const el = printRef.current
    if (!el || pdfBusyRef.current) return
    pdfBusyRef.current = true
    setPdfBusy(true)
    const filename = creditorPdfFilename(creditor.name)
    try {
      const blob: Blob = await renderCreditorPdfSinglePageBlob(el)
      const file = new File([blob], filename, { type: 'application/pdf' })

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Créancier — ${creditor.name}`,
          text: `${companyDisplay} — état des dettes et paiements`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.rel = 'noopener'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error(e)
      try {
        const blob = await renderCreditorPdfSinglePageBlob(el)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.rel = 'noopener'
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    } finally {
      pdfBusyRef.current = false
      setPdfBusy(false)
    }
  }, [companyDisplay, creditor.name])

  const companyLines = useMemo(() => getCreditorCompanyLines(creditor), [creditor])
  const countryLabel = creditorCountryDisplay(creditor)

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href={`/app/${companyId}/creditors`}
            className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Retour aux créanciers</span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="page-hero-subtitle mb-1">Créancier</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <h1 className="page-hero-title">{creditor.name}</h1>
              <Badge variant="outline" className="w-fit shrink-0 border-zinc-600 text-zinc-300">
                {creditorTypeLabel[creditor.creditor_type] ?? creditor.creditor_type}
              </Badge>
            </div>
            <p className="page-hero-subtitle mt-1">
              {companyDisplay} · Dettes et règlements associés à ce créancier.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800/90 text-zinc-400">
              <FileText className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Export PDF</p>
              <p className="mt-0.5 text-sm text-zinc-500">Gabarit A4 : en-tête société, tableaux, synthèse des montants.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
              onClick={handlePrint}
            >
              <Printer className="size-4" />
              Imprimer
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200"
              onClick={handleSharePdf}
              disabled={pdfBusy}
            >
              <Share2 className="size-4" />
              {pdfBusy ? 'Préparation…' : 'Partager'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="Encours (montants initiaux)"
            value={formatCurrency(totalAmount, currency)}
            tone="neutral"
            explain={KPI_EXPLAIN.debtDetailAmountTotal()}
          />
          <MetricCard
            label="Total payé"
            value={formatCurrency(totalPaid, currency)}
            tone="positive"
            explain={KPI_EXPLAIN.debtDetailPaid()}
          />
          <MetricCard
            label="Restant dû"
            value={formatCurrency(totalRemaining, currency)}
            tone={totalRemaining > 0 ? 'critical' : 'neutral'}
            explain={KPI_EXPLAIN.debtDetailRemaining()}
          />
        </div>

        <SectionBlock
          title="Échéances récurrentes"
          subtitle="Règles qui génèrent des dettes automatiquement pour ce créancier."
          explain={KPI_EXPLAIN.pageRecurringRules()}
          badge={recurringRules.length > 0 ? `${recurringRules.length}` : undefined}
          headerRight={
            recurringRules.length > 0 ? (
              <Link
                href={`/app/${companyId}/recurring-rules?creditor_id=${creditor.id}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:text-white',
                )}
              >
                Gérer les règles
              </Link>
            ) : undefined
          }
        >
          {recurringRules.length === 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-zinc-400">
                Aucune règle récurrente. Les charges mensuelles / trimestrielles sont pilotées depuis les règles
                récurrentes.
              </p>
              <Link
                href={`/app/${companyId}/recurring-rules?creditor_id=${creditor.id}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'shrink-0 border-zinc-700 text-zinc-200',
                )}
              >
                Voir / créer des règles
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/70 overflow-hidden rounded-lg border border-zinc-800/80">
              {recurringRules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-col gap-2 bg-zinc-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100">{rule.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <RecurringFrequencyBadge frequency={rule.frequency as FrequencyType} />
                      <span>
                        {formatCurrency(Number(rule.amount), rule.currency_code)} · Prochaine échéance{' '}
                        {formatDate(rule.next_run_date)}
                      </span>
                      {!rule.is_active ? (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-500">
                          Inactive
                        </Badge>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionBlock>

        <SectionBlock
          title="Coordonnées"
          subtitle="Contact et, pour une société, siège social."
          explain={KPI_EXPLAIN.referentialList('Créanciers')}
          headerRight={
            canManage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:text-white"
                onClick={() => setCreditorEditOpen(true)}
              >
                <Pencil size={14} />
                Modifier
              </Button>
            ) : undefined
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/35 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Contact</p>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="section-label mb-1">Email</dt>
                  <dd className="break-all text-zinc-100">{creditor.email ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="section-label mb-1">Téléphone</dt>
                  <dd className="text-zinc-100">{creditor.phone ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="section-label mb-1">Pays</dt>
                  <dd className="text-zinc-100">
                    {creditor.country_code ? (
                      <>
                        <span className="font-mono">{creditor.country_code}</span>
                        {countryLabel !== '—' ? (
                          <span className="text-zinc-500"> · {countryLabel}</span>
                        ) : null}
                      </>
                    ) : countryLabel !== '—' ? (
                      countryLabel
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {creditor.creditor_type === 'company' ? (
              <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/35 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Siège social</p>
                {companyLines.length > 0 ? (
                  <div className="border-l-2 border-zinc-600 pl-3">
                    {companyLines.map((line, i) => (
                      <p key={`${i}-${line.slice(0, 24)}`} className="text-sm leading-relaxed text-zinc-200">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500">Aucune adresse renseignée. Utilisez « Modifier » pour compléter.</p>
                    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="section-label mb-1">Immatriculation</dt>
                        <dd className="text-zinc-100">{creditor.company_registration ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="section-label mb-1">Adresse</dt>
                        <dd className="text-zinc-100">{creditor.address_street ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="section-label mb-1">Code postal</dt>
                        <dd className="text-zinc-100">{creditor.address_postal_code ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="section-label mb-1">Ville</dt>
                        <dd className="text-zinc-100">{creditor.address_city ?? '—'}</dd>
                      </div>
                    </dl>
                  </>
                )}
              </div>
            ) : null}
          </div>
          {creditor.notes ? (
            <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/20 p-4">
              <p className="section-label mb-2">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">{creditor.notes}</p>
            </div>
          ) : null}
        </SectionBlock>

        <SectionBlock
          title="Dettes"
          subtitle="Chaque ligne ouvre la fiche détaillée."
          explain={KPI_EXPLAIN.pageDebtDetail()}
          headerRight={
            canManage ? (
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200"
                onClick={() => setDebtDrawerOpen(true)}
              >
                <Plus size={14} />
                Ajouter une dette
              </Button>
            ) : undefined
          }
        >
          {debts.length === 0 ? (
            <EmptyState
              title="Aucune dette"
              description="Aucune obligation n’est encore liée à ce créancier. Utilisez « Ajouter une dette » ci-dessus ou créez une dette depuis l’écran Dettes."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-800/80">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/70">
                    {['Titre', 'Origine', 'Catégorie', 'Montant', 'Restant', 'Échéance', 'Priorité', 'Statut'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {debts.map((debt) => {
                    const status = debt.computed_status as DebtStatus
                    const priority = debt.priority as DebtPriority
                    const isPaid = status === 'paid' || status === 'cancelled'
                    const isOverdue = status === 'overdue' && !isPaid
                    const categoryName = debt.debt_categories?.name ?? '—'
                    return (
                      <tr
                        key={debt.id}
                        className={`transition-colors hover:bg-zinc-900/70 ${isPaid ? 'opacity-60' : ''} ${isOverdue ? 'bg-red-500/5' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/app/${companyId}/debts/${debt.id}`}
                            className="font-medium text-zinc-100 transition-colors hover:text-white"
                          >
                            {debt.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          {debt.is_recurring_instance ? (
                            <Badge
                              variant="outline"
                              className="border-violet-500/40 bg-violet-500/10 text-[10px] uppercase tracking-wide text-violet-300"
                            >
                              Récurrent
                            </Badge>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">{categoryName}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm text-zinc-300">
                          {formatCurrency(debt.amount_company_currency, currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold text-white">
                          {formatCurrency(Number(debt.remaining_company_currency), currency)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-zinc-400">
                          <span className={isOverdue ? 'text-red-400' : ''}>{formatDate(debt.due_date)}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <DebtPriorityBadge priority={priority} />
                        </td>
                        <td className="px-3 py-2.5">
                          <DebtStatusBadge status={status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </SectionBlock>

        <SectionBlock
          title="Paiements"
          subtitle="Règlements sur les dettes de ce créancier. Le badge « Dette récurrente » indique une dette liée à une règle."
          explain={KPI_EXPLAIN.debtDetailPaid()}
          headerRight={
            canManage ? (
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200"
                onClick={openAddPayment}
                disabled={payableDebts.length === 0}
                title={
                  payableDebts.length === 0
                    ? 'Aucun restant dû sur les dettes de ce créancier'
                    : undefined
                }
              >
                <Plus size={14} />
                Ajouter un paiement
              </Button>
            ) : undefined
          }
        >
          {paymentHint ? (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {paymentHint}
            </p>
          ) : null}
          <div className="overflow-hidden rounded-lg border border-zinc-800/80">
            <PaymentsTable
              payments={payments}
              defaultCurrency={currency}
              debtLinkCompanyId={companyId}
              canManage={canManage}
              onEditPayment={(p) => {
                const d = debts.find((x) => x.id === p.debt_id)
                if (!d) return
                setEditingPayment(p)
                setPaymentTargetDebt(d)
                setPaymentDrawerOpen(true)
              }}
              emptyTitle="Aucun paiement"
              emptyDescription="Aucun règlement sur les dettes de ce créancier pour l’instant."
            />
          </div>
        </SectionBlock>
      </div>

      <div
        id={creditorPdfDomIds.root}
        ref={printRef}
        className="creditor-pdf-print-surface"
        style={{
          width: PDF_A4_PAGE_PX.w,
          minHeight: PDF_A4_PAGE_PX.h,
          boxSizing: 'border-box',
          backgroundColor: '#f5f5f4',
          padding: 8,
        }}
      >
        <CreditorPdfTemplate
          company={company}
          creditor={creditor}
          debts={debts}
          payments={payments}
          currency={currency}
        />
      </div>

      <CreditorDrawer
        companyId={companyId}
        creditor={creditor}
        open={creditorEditOpen}
        onOpenChange={setCreditorEditOpen}
        onSuccess={refreshPage}
      />

      <DebtDrawer
        companyId={companyId}
        defaultCreditorId={creditor.id}
        creditors={creditors}
        debtCategories={debtCategories}
        debtTypes={debtTypes}
        open={debtDrawerOpen}
        onOpenChange={setDebtDrawerOpen}
        onSuccess={refreshPage}
        onRefresh={refreshPage}
      />

      {paymentTargetDebt ? (
        <PaymentDrawer
          companyId={companyId}
          debtId={paymentTargetDebt.id}
          debtCurrency={paymentTargetDebt.currency_code}
          capCurrency={currency}
          remainingAmount={
            editingPayment
              ? Number(paymentTargetDebt.remaining_company_currency) +
                Number(editingPayment.amount_company_currency)
              : Number(paymentTargetDebt.remaining_company_currency)
          }
          initialAmount={editingPayment ? undefined : Number(paymentTargetDebt.remaining_company_currency)}
          accounts={accounts}
          open={paymentDrawerOpen}
          onOpenChange={(open) => {
            setPaymentDrawerOpen(open)
            if (!open) {
              setEditingPayment(null)
              setPaymentTargetDebt(null)
            }
          }}
          onSuccess={refreshPage}
          editingPayment={editingPayment ?? undefined}
        />
      ) : null}

      <Dialog open={debtPickerOpen} onOpenChange={setDebtPickerOpen}>
        <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Quelle dette régler ?</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Choisissez la dette sur laquelle enregistrer ce paiement.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {payableDebts.map((d) => (
              <li key={d.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-between gap-3 border-zinc-700 py-2.5 text-left"
                  onClick={() => pickDebtForPayment(d)}
                >
                  <span className="min-w-0 truncate font-medium text-zinc-100">{d.title}</span>
                  <span className="shrink-0 font-mono text-sm text-zinc-400">
                    {formatCurrency(Number(d.remaining_company_currency), currency)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
