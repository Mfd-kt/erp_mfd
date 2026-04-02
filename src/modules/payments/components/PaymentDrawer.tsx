'use client'

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { createPayment, updatePayment } from '../actions'
import { CurrencySelect } from '@/components/ui/currency-select'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currencies'
import type { PaymentFormData } from '../schema'
import type { AccountWithBalance } from '@/lib/supabase/types'
import type { Payment } from '@/lib/supabase/types'
import {
  allowedAccountTypesForPaymentMethod,
  allowedPaymentMethodsForAccountType,
  type PaymentMethodDb,
} from '@/modules/payments/payment-account-policy'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
] as const

type EditingPayment = Pick<
  Payment,
  | 'id'
  | 'debt_id'
  | 'account_id'
  | 'amount'
  | 'currency_code'
  | 'payment_date'
  | 'payment_method'
  | 'reference'
  | 'notes'
  | 'amount_company_currency'
>

interface PaymentDrawerProps {
  companyId: string
  /** Si défini : compte imposé (ex. page détail d’un compte bancaire). */
  fixedAccountId?: string
  /** Dette cible (création). En édition, pris depuis `editingPayment` si absent. */
  debtId: string
  /** Devise d’affichage / saisie par défaut à la création (ex. devise de la dette). */
  debtCurrency: string
  /** Devise dans laquelle est exprimé le plafond `remainingAmount` (souvent devise société). */
  capCurrency: string
  /** Restant dû (création) ou plafond de saisie en devise société (édition : restant + ancien montant). */
  remainingAmount: number
  initialAmount?: number
  accounts: AccountWithBalance[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  /** Si défini : mode modification. */
  editingPayment?: EditingPayment | null
}

const emptyForm: Omit<PaymentFormData, 'debt_id'> = {
  account_id: '',
  amount: 0,
  currency_code: 'EUR',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: 'bank_transfer',
  reference: '',
  notes: '',
}

function pickAccountForMethod(
  accounts: AccountWithBalance[],
  method: PaymentFormData['payment_method'],
  preferredAccountId: string,
): string {
  const types = allowedAccountTypesForPaymentMethod(method as PaymentMethodDb)
  const eligible = accounts.filter((a) => types.includes(a.account_type))
  if (eligible.some((a) => a.id === preferredAccountId)) return preferredAccountId
  return eligible[0]?.id ?? ''
}

export function PaymentDrawer({
  companyId,
  fixedAccountId,
  debtId,
  debtCurrency,
  capCurrency,
  remainingAmount,
  initialAmount,
  accounts,
  open,
  onOpenChange,
  onSuccess,
  editingPayment,
}: PaymentDrawerProps) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = Boolean(editingPayment?.id)
  const effectiveDebtId = editingPayment?.debt_id ?? debtId

  const eligibleAccounts = useMemo(() => {
    const types = allowedAccountTypesForPaymentMethod(form.payment_method as PaymentMethodDb)
    return accounts.filter((a) => types.includes(a.account_type))
  }, [accounts, form.payment_method])

  const paymentMethodOptions = useMemo(() => {
    if (fixedAccountId) {
      const acc = accounts.find((a) => a.id === fixedAccountId)
      if (!acc) return [...PAYMENT_METHODS]
      const allowed = allowedPaymentMethodsForAccountType(acc.account_type)
      return PAYMENT_METHODS.filter((m) => allowed.includes(m.value as PaymentMethodDb))
    }
    return [...PAYMENT_METHODS]
  }, [fixedAccountId, accounts])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editingPayment?.id) {
      let accountId = fixedAccountId ?? editingPayment.account_id
      let method = (editingPayment.payment_method ?? 'bank_transfer') as PaymentFormData['payment_method']

      if (fixedAccountId) {
        const acc = accounts.find((a) => a.id === fixedAccountId)
        if (acc) {
          const allowed = allowedPaymentMethodsForAccountType(acc.account_type)
          if (!allowed.includes(method as PaymentMethodDb)) {
            method = allowed[0]
          }
        }
        accountId = fixedAccountId
      } else {
        accountId = pickAccountForMethod(accounts, method, accountId)
      }

      setForm({
        account_id: accountId,
        amount: Number(editingPayment.amount),
        currency_code: normalizeCurrencyCode(editingPayment.currency_code),
        payment_date: editingPayment.payment_date.slice(0, 10),
        payment_method: method,
        reference: editingPayment.reference ?? '',
        notes: editingPayment.notes ?? '',
      })
    } else {
      const defaultMethod: PaymentFormData['payment_method'] = 'bank_transfer'
      const accountId = fixedAccountId
        ? fixedAccountId
        : pickAccountForMethod(accounts, defaultMethod, accounts[0]?.id ?? '')
      let method = defaultMethod
      if (fixedAccountId) {
        const acc = accounts.find((a) => a.id === fixedAccountId)
        if (acc) {
          const allowed = allowedPaymentMethodsForAccountType(acc.account_type)
          if (!allowed.includes(method as PaymentMethodDb)) {
            method = allowed[0]
          }
        }
      }
      setForm({
        ...emptyForm,
        payment_date: new Date().toISOString().slice(0, 10),
        currency_code: normalizeCurrencyCode(debtCurrency),
        payment_method: method,
        amount: initialAmount ?? 0,
        account_id: accountId,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger le formulaire à l’ouverture / changement de paiement édité
  }, [open, editingPayment?.id, debtCurrency, initialAmount, accounts, fixedAccountId])

  const onPaymentMethodChange = useCallback(
    (next: PaymentFormData['payment_method']) => {
      setForm((p) => {
        if (fixedAccountId) {
          return { ...p, payment_method: next }
        }
        const nextAccount = pickAccountForMethod(accounts, next, p.account_id)
        return { ...p, payment_method: next, account_id: nextAccount }
      })
    },
    [accounts, fixedAccountId],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!effectiveDebtId) {
      setError('Dette requise.')
      return
    }
    if (!fixedAccountId && eligibleAccounts.length === 0) {
      setError(
        'Aucun compte compatible avec ce moyen de paiement. Créez par exemple un compte « Espèces » pour les paiements en espèces.',
      )
      return
    }
    const payload: PaymentFormData = {
      ...form,
      debt_id: effectiveDebtId,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    }
    startTransition(async () => {
      try {
        if (editingPayment?.id) {
          await updatePayment(companyId, editingPayment.id, payload)
        } else {
          await createPayment(companyId, payload)
        }
        setForm(emptyForm)
        onOpenChange(false)
        onSuccess()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  const accountHint =
    form.payment_method === 'cash'
      ? 'Espèces : uniquement un compte de type Caisse.'
      : form.payment_method === 'bank_transfer' || form.payment_method === 'check'
        ? 'Virement / chèque : compte bancaire.'
        : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-100 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Modifier le paiement' : 'Enregistrer un paiement'}</SheetTitle>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Paiement"
              description="Chaque paiement reduit le restant du de la dette cible."
              entries={[
                { label: 'Montant', description: 'Doit rester <= plafond affiche (restant du en devise societe).' },
                { label: 'Devise', description: 'Devise de saisie du paiement.' },
                { label: 'Moyen de paiement', description: 'Conditionne les comptes compatibles (banque, caisse, etc.).' },
                { label: 'Compte', description: 'Compte de tresorerie reel qui supporte l operation.' },
              ]}
              results={[
                { label: 'Restant du', description: 'Diminue apres enregistrement si paiement valide.' },
                { label: 'Historique paiement', description: 'Traçabilite via date, reference, compte et notes.' },
              ]}
            />
          </div>
        </SheetHeader>
        <p className="text-xs text-zinc-400 mt-1">
          {isEdit ? 'Plafond (devise société)' : 'Restant dû (devise société)'} : {remainingAmount.toFixed(2)}{' '}
          {capCurrency}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Montant *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={remainingAmount}
              value={form.amount || ''}
              onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
              required
              placeholder={`Max ${remainingAmount.toFixed(2)} ${capCurrency}`}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            />
            <p className="text-xs text-zinc-500">Le montant saisi ne peut pas depasser le restant du affiche.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Devise *</label>
            <CurrencySelect
              value={form.currency_code}
              onChange={(code: SupportedCurrencyCode) => setForm((p) => ({ ...p, currency_code: code }))}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Date *</label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Moyen de paiement *</label>
            <select
              value={form.payment_method}
              onChange={(e) => onPaymentMethodChange(e.target.value as PaymentFormData['payment_method'])}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            >
              {paymentMethodOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {fixedAccountId && (
              <p className="text-xs text-zinc-500">
                Les moyens proposés correspondent au type de ce compte (ex. pas d’espèces sur un compte banque).
              </p>
            )}
          </div>
          {fixedAccountId ? (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
              Compte :{' '}
              <span className="font-medium text-white">
                {accounts.find((a) => a.id === fixedAccountId)?.name ?? '—'} (
                {accounts.find((a) => a.id === fixedAccountId)?.currency_code})
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Compte *</label>
              {eligibleAccounts.length === 0 ? (
                <p className="text-sm text-amber-400 bg-amber-950/40 border border-amber-800 rounded-md px-3 py-2">
                  Aucun compte ne correspond à ce moyen de paiement. Ajoutez un compte du bon type dans Comptes (ex.
                  Caisse pour les espèces).
                </p>
              ) : (
                <>
                  <select
                    value={form.account_id}
                    onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    {eligibleAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency_code}) · {a.account_type}
                      </option>
                    ))}
                  </select>
                  {accountHint && <p className="text-xs text-zinc-500">{accountHint}</p>}
                </>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Référence</label>
            <input
              type="text"
              value={form.reference ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || (!fixedAccountId && eligibleAccounts.length === 0)}>
              {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
