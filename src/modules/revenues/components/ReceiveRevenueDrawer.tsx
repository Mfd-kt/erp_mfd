'use client'

import { useState, useTransition, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { receiveRevenue } from '../actions'
import type { ReceiveRevenueFormData } from '../schema'
import type { AccountWithBalance } from '@/lib/supabase/types'

interface ReceiveRevenueDrawerProps {
  companyId: string
  revenueId: string
  amountExpected: number
  currency: string
  accounts: AccountWithBalance[]
  /** Compte pré-sélectionné (ex. page détail compte). */
  defaultAccountId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const emptyForm: ReceiveRevenueFormData = { amount_received: 0, received_date: new Date().toISOString().slice(0, 10), account_id: '', notes: '' }
const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function ReceiveRevenueDrawer({
  companyId,
  revenueId,
  amountExpected,
  currency,
  accounts,
  defaultAccountId,
  open,
  onOpenChange,
  onSuccess,
}: ReceiveRevenueDrawerProps) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      const acc =
        (defaultAccountId && accounts.some((a) => a.id === defaultAccountId) ? defaultAccountId : undefined) ??
        accounts[0]?.id ??
        ''
      setForm({
        ...emptyForm,
        received_date: new Date().toISOString().slice(0, 10),
        amount_received: amountExpected,
        account_id: acc,
      })
      setError(null)
    }
  }, [open, amountExpected, accounts, defaultAccountId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload: ReceiveRevenueFormData = { ...form, notes: form.notes || undefined }
    startTransition(async () => {
      try {
        await receiveRevenue(companyId, revenueId, payload)
        setForm(emptyForm)
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
          <SheetTitle className="text-2xl font-semibold text-white">Enregistrer une réception</SheetTitle>
          <p className="text-sm text-zinc-500">Montant attendu : {amountExpected.toFixed(2)} {currency}</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Reception de revenu"
              entries={[
                { label: 'Compte', description: 'Compte de tresorerie qui recoit l encaissement.' },
                { label: 'Montant recu', description: 'Montant effectivement encaisse (<= attendu).' },
                { label: 'Date de reception', description: 'Date reelle de l encaissement.' },
              ]}
              results={[
                { label: 'Total recu', description: 'Mis a jour dans les KPI revenus.' },
                { label: 'Reste a recevoir', description: 'Diminue apres enregistrement.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Encaissement</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Compte *</label>
              {defaultAccountId && accounts.some((a) => a.id === defaultAccountId) ? (
                <p className={`${fieldClass} text-zinc-300`}>
                  {accounts.find((a) => a.id === defaultAccountId)?.name} (
                  {accounts.find((a) => a.id === defaultAccountId)?.currency_code})
                </p>
              ) : (
                <select
                  value={form.account_id}
                  onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}
                  required
                  className={fieldClass}
                >
                  <option value="">Sélectionner...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency_code})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Montant reçu *</label><input type="number" step="0.01" min="0" max={amountExpected} value={form.amount_received || ''} onChange={(e) => setForm((p) => ({ ...p, amount_received: parseFloat(e.target.value) || 0 }))} required className={fieldClass} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Date de réception *</label><input type="date" value={form.received_date} onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))} required className={fieldClass} /></div>
            </div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Notes</label><textarea value={form.notes ?? ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className={`${fieldClass} resize-none`} /></div>
          {error ? <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p> : null}
          <SheetFooter className="mt-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
            <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>{isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
