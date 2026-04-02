'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CurrencySelect } from '@/components/ui/currency-select'
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currencies'
import type { RecurringRuleFormData } from '../schema'
import type { RecurringRuleRow } from '../types'
import type { Creditor, DebtCategory, DebtType } from '@/lib/supabase/types'
import { createRecurringRule, updateRecurringRule } from '../actions'
import { CreditorDrawer } from '@/modules/creditors/components/CreditorDrawer'
import { DebtCategoryDrawer } from '@/modules/debt-categories/components/DebtCategoryDrawer'
import { Plus } from 'lucide-react'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'

const FREQUENCIES = [{ value: 'monthly', label: 'Mensuel' }, { value: 'quarterly', label: 'Trimestriel' }, { value: 'yearly', label: 'Annuel' }] as const
const MONTHS = [{ value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' }, { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }]
const emptyForm: RecurringRuleFormData = { title: '', creditor_id: null, debt_category_id: '', template_description: '', amount: 0, currency_code: 'EUR', frequency: 'monthly', interval_count: 1, day_of_month: 1, month_of_year: null, start_date: new Date().toISOString().slice(0, 10), end_date: null, auto_generate: true, is_active: true }
const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

interface RecurringRuleDrawerProps { companyId: string; rule?: RecurringRuleRow | null; creditors: Creditor[]; debtCategories: DebtCategory[]; debtTypes: DebtType[]; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }

export function RecurringRuleDrawer({ companyId, rule, creditors, debtCategories, debtTypes, open, onOpenChange, onSuccess }: RecurringRuleDrawerProps) {
  const router = useRouter()
  const [form, setForm] = useState<RecurringRuleFormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [creditorOverlayOpen, setCreditorOverlayOpen] = useState(false)
  const [categoryOverlayOpen, setCategoryOverlayOpen] = useState(false)
  const isEdit = !!rule?.id

  useEffect(() => {
    if (open) {
      setForm(rule ? { title: rule.title, creditor_id: rule.creditor_id ?? null, debt_category_id: rule.debt_category_id, template_description: rule.template_description ?? '', amount: Number(rule.amount), currency_code: normalizeCurrencyCode(rule.currency_code), frequency: rule.frequency as RecurringRuleFormData['frequency'], interval_count: rule.interval_count ?? 1, day_of_month: rule.day_of_month ?? null, month_of_year: rule.month_of_year ?? null, start_date: rule.start_date.slice(0, 10), end_date: rule.end_date?.slice(0, 10) ?? null, auto_generate: rule.auto_generate ?? true, is_active: rule.is_active ?? true } : { ...emptyForm, start_date: new Date().toISOString().slice(0, 10) })
      setError(null)
    }
  }, [open, rule])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = { ...form, day_of_month: form.frequency !== 'yearly' && form.day_of_month != null ? form.day_of_month : (form.day_of_month ?? 1), month_of_year: form.frequency === 'yearly' ? (form.month_of_year ?? 1) : null }
    startTransition(async () => {
      try {
        if (isEdit && rule) await updateRecurringRule(companyId, { ...payload, id: rule.id })
        else await createRecurringRule(companyId, payload)
        onOpenChange(false)
        onSuccess()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold text-white">{isEdit ? 'Modifier la règle récurrente' : 'Nouvelle règle récurrente'}</SheetTitle>
          <p className="text-sm text-zinc-500">Crée une règle claire, stable et lisible pour automatiser les charges récurrentes sans ambiguïté.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Regle recurrente"
              entries={[
                { label: 'Montant / Devise', description: 'Valeur generee a chaque occurrence.' },
                { label: 'Frequence', description: 'Mensuel, trimestriel ou annuel avec jour/mois associe.' },
                { label: 'Debut / Fin', description: 'Periode de validite de la regle.' },
                { label: 'Auto-generation', description: 'Si active, les dettes sont creees automatiquement.' },
              ]}
              results={[
                { label: 'Generation automatique', description: 'Creation reguliere des dettes selon calendrier.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <p className="section-label">Identification</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Titre *</label><input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required className={fieldClass} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-zinc-300">Créancier</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setCreditorOverlayOpen(true)}
                    title="Créer un créancier"
                    aria-label="Créer un créancier"
                  >
                    <Plus size={12} />
                  </Button>
                </div>
                <select value={form.creditor_id ?? ''} onChange={(e) => setForm((p) => ({ ...p, creditor_id: e.target.value || null }))} className={fieldClass}><option value="">— Aucun —</option>{creditors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-zinc-300">Catégorie *</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setCategoryOverlayOpen(true)}
                    title="Créer une catégorie"
                    aria-label="Créer une catégorie"
                  >
                    <Plus size={12} />
                  </Button>
                </div>
                <select value={form.debt_category_id} onChange={(e) => setForm((p) => ({ ...p, debt_category_id: e.target.value }))} required className={fieldClass}><option value="">Sélectionner...</option>{debtCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Description</label><textarea value={form.template_description ?? ''} onChange={(e) => setForm((p) => ({ ...p, template_description: e.target.value || null }))} rows={3} className={`${fieldClass} resize-none`} /></div>
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Mécanique financière</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Montant *</label><input type="number" step="0.01" min="0" value={form.amount || ''} onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} required className={fieldClass} /></div>
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
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Fréquence *</label><select value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as RecurringRuleFormData['frequency'] }))} className={fieldClass}>{FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
            {(form.frequency === 'monthly' || form.frequency === 'quarterly') && <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Jour du mois *</label><input type="number" min={1} max={31} value={form.day_of_month ?? ''} onChange={(e) => setForm((p) => ({ ...p, day_of_month: parseInt(e.target.value, 10) || null }))} className={fieldClass} /></div>}
            {form.frequency === 'yearly' && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Mois de l'année *</label><select value={form.month_of_year ?? ''} onChange={(e) => setForm((p) => ({ ...p, month_of_year: parseInt(e.target.value, 10) || null }))} className={fieldClass}>{MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div><div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Jour du mois *</label><input type="number" min={1} max={31} value={form.day_of_month ?? ''} onChange={(e) => setForm((p) => ({ ...p, day_of_month: parseInt(e.target.value, 10) || null }))} className={fieldClass} /></div></div>}
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Cycle de vie</p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Comment utiliser ces options</p>
              <p className="mt-1">
                <span className="text-zinc-200">Règle active</span> active/désactive la règle.
                Si décochée, elle reste enregistrée mais n'est plus traitée.
              </p>
              <p className="mt-1">
                <span className="text-zinc-200">Auto-génération</span> crée automatiquement la dette selon la fréquence.
                Si décochée, la règle est conservée mais s'exécute uniquement manuellement.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Début *</label><input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required className={fieldClass} /></div><div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Fin</label><input type="date" value={form.end_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value || null }))} className={fieldClass} /></div></div>
            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.auto_generate ?? true} onChange={(e) => setForm((p) => ({ ...p, auto_generate: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Auto-génération</label>
              <p className="pl-7 text-xs text-zinc-500">ON: génération automatique. OFF: exécution manuelle uniquement.</p>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Règle active</label>
              <p className="pl-7 text-xs text-zinc-500">ON: la règle est prise en compte. OFF: la règle est en pause.</p>
            </div>
          </div>
          {error ? <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p> : null}
          <SheetFooter className="mt-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>{isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    <CreditorDrawer
      companyId={companyId}
      open={creditorOverlayOpen}
      onOpenChange={setCreditorOverlayOpen}
      onSuccess={(createdId) => {
        setCreditorOverlayOpen(false)
        if (createdId) {
          setForm((p) => ({ ...p, creditor_id: createdId }))
          router.refresh()
        }
      }}
    />
    <DebtCategoryDrawer
      companyId={companyId}
      debtTypes={debtTypes}
      open={categoryOverlayOpen}
      onOpenChange={setCategoryOverlayOpen}
      onRefresh={() => router.refresh()}
      asDialog
      onSuccess={(createdId) => {
        setCategoryOverlayOpen(false)
        if (createdId) {
          setForm((p) => ({ ...p, debt_category_id: createdId }))
          router.refresh()
        }
      }}
    />
    </>
  )
}
