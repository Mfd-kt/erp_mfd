'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import type { Company } from '@/lib/supabase/types'
import { createCompany, updateCompany } from '../actions'
import { CURRENCY_OPTIONS, normalizeCurrencyCode } from '@/lib/currencies'
import type { CompanyFormData } from '../schema'

const COUNTRIES = [
  { code: 'FR', label: 'France' },
  { code: 'TN', label: 'Tunisie' },
  { code: 'US', label: 'États-Unis' },
] as const

interface CompanyDrawerProps {
  groupId: string
  company?: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const emptyForm: CompanyFormData = {
  legal_name: '',
  trade_name: '',
  type: 'business',
  country_code: 'FR',
  default_currency: 'EUR',
  timezone: 'Europe/Paris',
  is_active: true,
}

export function CompanyDrawer({
  groupId,
  company,
  open,
  onOpenChange,
  onSuccess,
}: CompanyDrawerProps) {
  const [form, setForm] = useState<CompanyFormData>(company ? {
    legal_name: company.legal_name,
    trade_name: company.trade_name ?? '',
    type: (company as { type?: 'business' | 'personal' }).type ?? 'business',
    country_code: company.country_code,
    default_currency: normalizeCurrencyCode(company.default_currency),
    timezone: company.timezone,
    is_active: company.is_active,
  } : emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = !!company?.id

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = { ...form, trade_name: form.trade_name || undefined }
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateCompany(groupId, { ...payload, id: company.id })
        } else {
          await createCompany(groupId, payload)
        }
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
      <SheetContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-100 w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Modifier la société' : 'Nouvelle société'}</SheetTitle>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Societe"
              entries={[
                { label: 'Raison sociale', description: 'Nom legal officiel de l entite.' },
                { label: 'Nom commercial', description: 'Nom d usage affiche dans les vues.' },
                { label: 'Pays / Devise', description: 'Contexte fiscal et monetaire principal.' },
              ]}
              results={[
                { label: 'Societe active', description: 'Visible et utilisable dans les operations metier.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Raison sociale *</label>
            <input
              type="text"
              value={form.legal_name}
              onChange={(e) => setForm((p) => ({ ...p, legal_name: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Nom commercial</label>
            <input
              type="text"
              value={form.trade_name ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, trade_name: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'business' | 'personal' }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            >
              <option value="business">Professionnel</option>
              <option value="personal">Personnel</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Pays *</label>
            <select
              value={form.country_code}
              onChange={(e) => setForm((p) => ({ ...p, country_code: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Devise *</label>
            <select
              value={form.default_currency}
              onChange={(e) => setForm((p) => ({ ...p, default_currency: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Fuseau horaire</label>
            <input
              type="text"
              value={form.timezone}
              onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
            />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded border-zinc-600 bg-zinc-800"
              />
              <label htmlFor="is_active" className="text-sm text-zinc-300">Société active</label>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
