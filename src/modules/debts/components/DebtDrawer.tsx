'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CurrencySelect } from '@/components/ui/currency-select'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currencies'
import type { DebtFormData } from '../schema'
import type { DebtRow } from '../queries'
import type { Creditor, DebtCategory, DebtType } from '@/lib/supabase/types'
import { createDebt, updateDebt } from '../actions'
import { CreditorDrawer } from '@/modules/creditors/components/CreditorDrawer'
import { DebtCategoryDrawer } from '@/modules/debt-categories/components/DebtCategoryDrawer'

const PRIORITIES = [
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Haute' },
  { value: 'normal', label: 'Normale' },
  { value: 'low', label: 'Basse' },
] as const

const emptyForm: DebtFormData = {
  title: '', creditor_id: '', debt_category_id: '', amount_original: 0, currency_code: 'EUR', incurred_date: new Date().toISOString().slice(0, 10), due_date: null, priority: 'normal', notes: '',
}

interface DebtDrawerProps {
  companyId: string
  debt?: DebtRow | null
  /** Préremplit le créancier à la création (ex. fiche créancier). */
  defaultCreditorId?: string
  creditors: Creditor[]
  debtCategories: DebtCategory[]
  debtTypes: DebtType[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onRefresh: () => void
}

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function DebtDrawer({
  companyId,
  debt,
  defaultCreditorId,
  creditors,
  debtCategories,
  debtTypes,
  open,
  onOpenChange,
  onSuccess,
  onRefresh,
}: DebtDrawerProps) {
  const [form, setForm] = useState<DebtFormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [creditorOverlayOpen, setCreditorOverlayOpen] = useState(false)
  const [categoryOverlayOpen, setCategoryOverlayOpen] = useState(false)
  const isEdit = !!debt?.id

  useEffect(() => {
    if (open) {
      if (debt) {
        setForm({ title: debt.title, creditor_id: debt.creditor_id, debt_category_id: debt.debt_category_id, amount_original: Number(debt.amount_original), currency_code: normalizeCurrencyCode(debt.currency_code), incurred_date: debt.incurred_date?.slice(0, 10) ?? '', due_date: debt.due_date?.slice(0, 10) ?? null, priority: (debt.priority as DebtFormData['priority']) ?? 'normal', notes: debt.notes ?? '' })
      } else {
        setForm({
          ...emptyForm,
          incurred_date: new Date().toISOString().slice(0, 10),
          creditor_id: defaultCreditorId ?? '',
        })
      }
      setError(null)
    }
  }, [open, debt, defaultCreditorId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload: DebtFormData = { ...form, due_date: form.due_date || null, notes: form.notes || undefined }
    startTransition(async () => {
      try {
        if (isEdit && debt) await updateDebt(companyId, { ...payload, id: debt.id })
        else await createDebt(companyId, payload)
        setForm(emptyForm)
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
          <SheetTitle className="text-2xl font-semibold text-white">{isEdit ? 'Modifier la dette' : 'Nouvelle dette'}</SheetTitle>
          <p className="text-sm text-zinc-500">Décris l'obligation, sa contrepartie et son échéance pour la rendre immédiatement exploitable.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Dette"
              description="Renseigne les champs essentiels pour suivre le restant du et les priorites."
              entries={[
                { label: 'Titre', description: 'Nom court et explicite de la dette (facture, pret, loyer...).' },
                { label: 'Creancier', description: 'Entite a laquelle la societe doit payer.' },
                { label: 'Montant + Devise', description: 'Montant initial dans la devise de la dette.' },
                { label: 'Date de survenance / Echeance', description: 'Date d origine et date limite de paiement.' },
                { label: 'Priorite', description: 'Impacte la priorisation visuelle dans les vues et KPI.' },
              ]}
              results={[
                { label: 'Total ouvert', description: 'Somme des restants dus non payes/non annules.' },
                { label: 'En retard', description: 'Dettes dont l echeance est depassee avec un restant > 0.' },
                { label: 'Critiques', description: 'Sous-ensemble des dettes ouvertes marquees en priorite critique.' },
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
                <label className="text-sm font-medium text-zinc-300">Créancier *</label>
                <div className="flex gap-2">
                  <select value={form.creditor_id} onChange={(e) => setForm((p) => ({ ...p, creditor_id: e.target.value }))} required className={fieldClass}><option value="">Sélectionner...</option>{creditors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => setCreditorOverlayOpen(true)} title="Créer un créancier"><Plus size={16} /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Catégorie *</label>
                <div className="flex gap-2">
                  <select value={form.debt_category_id} onChange={(e) => setForm((p) => ({ ...p, debt_category_id: e.target.value }))} required className={fieldClass}><option value="">Sélectionner...</option>{debtCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => setCategoryOverlayOpen(true)} title="Créer une catégorie"><Plus size={16} /></Button>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Paramètres financiers</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Montant *</label><input type="number" step="0.01" min="0" value={form.amount_original || ''} onChange={(e) => setForm((p) => ({ ...p, amount_original: parseFloat(e.target.value) || 0 }))} required className={fieldClass} /><p className="text-xs text-zinc-500">Montant initial de la dette, avant paiements partiels.</p></div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Date de survenance *</label><input type="date" value={form.incurred_date} onChange={(e) => setForm((p) => ({ ...p, incurred_date: e.target.value }))} required className={fieldClass} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Échéance</label><input type="date" value={form.due_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value || null }))} className={fieldClass} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Priorité</label><select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as DebtFormData['priority'] }))} className={fieldClass}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            </div>
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
    <CreditorDrawer
      companyId={companyId}
      open={creditorOverlayOpen}
      onOpenChange={setCreditorOverlayOpen}
      onSuccess={(createdId) => {
        setCreditorOverlayOpen(false)
        if (createdId) {
          setForm((p) => ({ ...p, creditor_id: createdId }))
          onRefresh()
        }
      }}
    />
    <DebtCategoryDrawer
      companyId={companyId}
      debtTypes={debtTypes}
      open={categoryOverlayOpen}
      onOpenChange={setCategoryOverlayOpen}
      onRefresh={onRefresh}
      asDialog
      onSuccess={(createdId) => {
        setCategoryOverlayOpen(false)
        if (createdId) {
          setForm((p) => ({ ...p, debt_category_id: createdId }))
          onRefresh()
        }
      }}
    />
    </>
  )
}
