'use client'

import { useState, useTransition, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CurrencySelect } from '@/components/ui/currency-select'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currencies'
import type { RevenueFormData } from '../schema'
import type { RevenueRow } from '../queries'
import { createRevenue, updateRevenue } from '../actions'
import type { RevenueClient } from '@/lib/supabase/types'

const emptyForm: RevenueFormData = {
  title: '',
  revenue_category: 'other',
  client_id: null,
  client_name: '',
  source_name: '',
  amount_expected: 0,
  currency_code: 'EUR',
  expected_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

interface RevenueDrawerProps {
  companyId: string
  revenue?: RevenueRow | null
  revenueClients: RevenueClient[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function RevenueDrawer({
  companyId,
  revenue,
  revenueClients,
  open,
  onOpenChange,
  onSuccess,
}: RevenueDrawerProps) {
  const [form, setForm] = useState<RevenueFormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!revenue?.id

  useEffect(() => {
    if (open) {
      if (revenue) {
        const matchedClient =
          revenue.client_id != null
            ? revenueClients.find((c) => c.id === revenue.client_id) ?? null
            : (revenue.source_name
                ? revenueClients.find(
                    (c) => c.name.trim().toLowerCase() === revenue.source_name?.trim().toLowerCase()
                  ) ?? null
                : null)
        setForm({
          title: revenue.title,
          revenue_category: revenue.revenue_category ?? 'other',
          client_id: matchedClient?.id ?? revenue.client_id ?? null,
          client_name: '',
          source_name: revenue.source_name ?? '',
          amount_expected: Number(revenue.amount_expected) || 0,
          currency_code: normalizeCurrencyCode(revenue.currency_code),
          expected_date: revenue.expected_date?.slice(0, 10) ?? '',
          notes: revenue.notes ?? '',
        })
      } else {
        setForm({ ...emptyForm, expected_date: new Date().toISOString().slice(0, 10) })
      }
      setError(null)
    }
  }, [open, revenue])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const selectedClient = revenueClients.find((c) => c.id === (form.client_id ?? ''))
    const isLegacyClient = Boolean(form.client_id && form.client_id.startsWith('legacy:'))
    const normalizedClientId = isLegacyClient ? null : form.client_id
    const normalizedClientName =
      form.revenue_category === 'client'
        ? (form.client_name?.trim() || selectedClient?.name || undefined)
        : undefined
    const payload: RevenueFormData = {
      ...form,
      client_id: normalizedClientId,
      client_name: normalizedClientName,
      source_name: form.source_name || undefined,
      notes: form.notes || undefined,
    }
    startTransition(async () => {
      try {
        if (isEdit && revenue) await updateRevenue(companyId, { ...payload, id: revenue.id })
        else await createRevenue(companyId, payload)
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
          <SheetTitle className="text-2xl font-semibold text-white">{isEdit ? 'Modifier le revenu' : 'Nouveau revenu'}</SheetTitle>
          <p className="text-sm text-zinc-500">Crée un revenu attendu pour structurer le pipeline commercial et les encaissements à venir.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Revenu"
              description="Ce formulaire sert a planifier un encaissement attendu puis a suivre son avancement."
              entries={[
                { label: 'Categorie', description: 'Client, vente de bien ou autre origine de revenu.' },
                { label: 'Client existant / Nouveau client', description: 'Lie la ligne a un client connu ou saisis un nouveau nom.' },
                { label: 'Montant attendu', description: 'Montant previsionnel a encaisser.' },
                { label: 'Date attendue', description: 'Date cible pour la reception du paiement.' },
              ]}
              results={[
                { label: 'Total attendu', description: 'Somme des montants prevus non annules.' },
                { label: 'Total recu', description: 'Somme deja encaissee sur les lignes de revenu.' },
                { label: 'Pipeline', description: 'Vue combinee attendu vs recu pour piloter le cash-in.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <p className="section-label">Identification</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Titre *</label><input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required className={fieldClass} /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Catégorie *</label>
              <select
                value={form.revenue_category}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    revenue_category: e.target.value as RevenueFormData['revenue_category'],
                    client_id: e.target.value === 'client' ? p.client_id : null,
                    client_name: e.target.value === 'client' ? p.client_name : '',
                  }))
                }
                className={fieldClass}
              >
                <option value="client">Client</option>
                <option value="goods_sale">Vente de bien</option>
                <option value="other">Autre</option>
              </select>
            </div>
            {form.revenue_category === 'client' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Client existant</label>
                  <select
                    value={form.client_id ?? ''}
                    onChange={(e) =>
                      setForm((p) => {
                        const selectedId = e.target.value || null
                        const selectedClient = revenueClients.find((c) => c.id === selectedId) ?? null
                        return {
                          ...p,
                          client_id: selectedId,
                          client_name: '',
                          source_name: selectedClient?.name ?? p.source_name,
                        }
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="">Sélectionner...</option>
                    {revenueClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Nouveau client</label>
                  <input
                    type="text"
                    value={form.client_name ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
                    placeholder="Ex: Société ABC"
                    className={fieldClass}
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Source</label><input type="text" value={form.source_name ?? ''} onChange={(e) => setForm((p) => ({ ...p, source_name: e.target.value }))} className={fieldClass} /></div>
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Paramètres financiers</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Montant attendu *</label><input type="number" step="0.01" min="0" value={form.amount_expected || ''} onChange={(e) => setForm((p) => ({ ...p, amount_expected: parseFloat(e.target.value) || 0 }))} required className={fieldClass} /><p className="text-xs text-zinc-500">Valeur prevue du revenu; le recu sera suivi ensuite.</p></div>
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
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Date attendue *</label><input type="date" value={form.expected_date} onChange={(e) => setForm((p) => ({ ...p, expected_date: e.target.value }))} required className={fieldClass} /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Notes</label><textarea value={form.notes ?? ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className={`${fieldClass} resize-none`} /></div>
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
