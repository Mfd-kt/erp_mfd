'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { CurrencySelect } from '@/components/ui/currency-select'
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currencies'
import type { ExchangeRate } from '@/lib/supabase/types'
import { createExchangeRate, updateExchangeRate } from '../actions'
import type { ExchangeRateFormData } from '../schema'

interface ExchangeRateDrawerProps {
  groupId: string
  baseCurrency: string
  rate?: ExchangeRate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const emptyForm: ExchangeRateFormData = {
  from_currency: 'TND',
  to_currency: 'EUR',
  rate: 1,
  rate_date: new Date().toISOString().slice(0, 10),
}

const fieldClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function ExchangeRateDrawer({
  groupId,
  baseCurrency,
  rate,
  open,
  onOpenChange,
  onSuccess,
}: ExchangeRateDrawerProps) {
  const [form, setForm] = useState<ExchangeRateFormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!rate?.id

  useEffect(() => {
    if (!open) return
    setError(null)
    if (rate?.id) {
      setForm({
        from_currency: normalizeCurrencyCode(rate.from_currency),
        to_currency: normalizeCurrencyCode(rate.to_currency),
        rate: Number(rate.rate),
        rate_date: rate.rate_date.slice(0, 10),
      })
    } else {
      const from = normalizeCurrencyCode(baseCurrency)
      const to = (['TND', 'EUR', 'USD'] as const).find((c) => c !== from) ?? 'EUR'
      setForm({
        ...emptyForm,
        from_currency: from,
        to_currency: to,
        rate_date: new Date().toISOString().slice(0, 10),
      })
    }
  }, [open, rate?.id, baseCurrency])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (isEdit && rate) {
          await updateExchangeRate(groupId, { ...form, id: rate.id })
        } else {
          await createExchangeRate(groupId, form)
        }
        onOpenChange(false)
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold text-white">
            {isEdit ? 'Modifier le taux' : 'Nouveau taux'}
          </SheetTitle>
          <p className="text-sm text-zinc-500">
            1 unité de la devise « Depuis » = <span className="text-zinc-300">taux</span> unités de la devise « Vers ».
            Utilisé pour la prévision groupe et le contrôle global (devise de base du groupe :{' '}
            <span className="font-mono text-zinc-300">{baseCurrency}</span>).
          </p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Taux de change"
              entries={[
                { label: 'Depuis / Vers', description: 'Paire de devises de conversion.' },
                { label: 'Taux', description: '1 unite depuis = taux unites vers.' },
                { label: 'Valable a partir du', description: 'Date d effet du taux pour les calculs.' },
              ]}
              results={[
                { label: 'Consolidation groupe', description: 'Utilise pour convertir les KPI multi-devises.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Depuis *</label>
              <CurrencySelect
                value={form.from_currency}
                onChange={(code: SupportedCurrencyCode) => setForm((p) => ({ ...p, from_currency: code }))}
                required
                className={`${fieldClass} font-mono`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Vers *</label>
              <CurrencySelect
                value={form.to_currency}
                onChange={(code: SupportedCurrencyCode) => setForm((p) => ({ ...p, to_currency: code }))}
                required
                className={`${fieldClass} font-mono`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Taux *</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.rate || ''}
              onChange={(e) => setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Valable à partir du *</label>
            <input
              type="date"
              value={form.rate_date}
              onChange={(e) => setForm((p) => ({ ...p, rate_date: e.target.value }))}
              required
              className={fieldClass}
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
          ) : null}
          <SheetFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>
              {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
