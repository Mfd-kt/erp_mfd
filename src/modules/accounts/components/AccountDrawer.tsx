'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Account } from '@/lib/supabase/types'
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currencies'
import { CurrencySelect } from '@/components/ui/currency-select'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { createAccount, updateAccount } from '../actions'
import type { AccountFormData } from '../schema'

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Banque' },
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'wallet', label: 'Portefeuille' },
] as const

interface AccountDrawerProps {
  companyId: string
  account?: Account | null
  defaultCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const emptyForm: AccountFormData = {
  name: '',
  account_type: 'bank',
  currency_code: 'EUR',
  opening_balance: 0,
  is_active: true,
}

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function AccountDrawer({ companyId, account, defaultCurrency, open, onOpenChange, onSuccess }: AccountDrawerProps) {
  const [form, setForm] = useState<AccountFormData>({ ...emptyForm, currency_code: normalizeCurrencyCode(defaultCurrency) })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!account?.id

  useEffect(() => {
    if (open) {
      setForm(account ? {
        name: account.name,
        account_type: account.account_type,
        currency_code: normalizeCurrencyCode(account.currency_code),
        opening_balance: account.opening_balance,
        is_active: account.is_active,
      } : { ...emptyForm, currency_code: normalizeCurrencyCode(defaultCurrency) })
      setError(null)
    }
  }, [open, account, defaultCurrency])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (isEdit && account) await updateAccount(companyId, { ...form, id: account.id })
        else await createAccount(companyId, form)
        setForm({ ...emptyForm, currency_code: normalizeCurrencyCode(defaultCurrency) })
        onOpenChange(false)
        onSuccess()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold text-white">{isEdit ? 'Modifier le compte' : 'Nouveau compte'}</SheetTitle>
          <p className="text-sm text-zinc-500">Configure un support de trésorerie clair, exploitable et cohérent avec la devise de l'entité.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Compte"
              description="Un compte represente un support de tresorerie utilise par les paiements."
              entries={[
                { label: 'Nom', description: 'Libelle metier du compte (Banque X, Caisse principale, etc.).' },
                { label: 'Type', description: 'Determine quels moyens de paiement sont compatibles.' },
                { label: 'Devise', description: 'Devise native du compte pour le suivi des soldes.' },
                { label: 'Solde d ouverture', description: 'Point de depart historique du solde.' },
              ]}
              results={[
                { label: 'Solde courant', description: 'Evolue selon les paiements et mouvements rattaches.' },
                { label: 'Compte actif/inactif', description: 'Un compte inactif n est plus propose aux nouvelles saisies.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <p className="section-label">Informations générales</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={fieldClass} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Type</label><select value={form.account_type} onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value as AccountFormData['account_type'] }))} className={fieldClass}>{ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Devise *</label>
                <CurrencySelect
                  value={form.currency_code}
                  onChange={(code: SupportedCurrencyCode) => setForm((p) => ({ ...p, currency_code: code }))}
                  required
                  className={`${fieldClass} font-mono`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Position financière</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Solde d'ouverture</label><input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm((p) => ({ ...p, opening_balance: parseFloat(e.target.value) || 0 }))} className={fieldClass} /></div>
            {isEdit ? <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Compte actif</label> : null}
          </div>

          {error ? <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p> : null}

          <SheetFooter className="mt-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
            <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>{isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
