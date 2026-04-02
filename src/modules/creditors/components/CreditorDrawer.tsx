'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import type { Creditor } from '@/lib/supabase/types'
import { createCreditor, updateCreditor } from '../actions'
import type { CreditorFormData } from '../schema'

const CREDITOR_TYPES = [
  { value: 'person', label: 'Personne' },
  { value: 'company', label: 'Société' },
  { value: 'employee', label: 'Employé' },
  { value: 'government', label: 'Gouvernement' },
  { value: 'landlord', label: 'Propriétaire' },
  { value: 'bank', label: 'Banque' },
  { value: 'other', label: 'Autre' },
] as const

interface CreditorDrawerProps {
  companyId: string
  creditor?: Creditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (createdId?: string) => void
}

const emptyForm: CreditorFormData = { name: '', creditor_type: 'other', country_code: undefined, email: '', phone: '', notes: '' }
const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function CreditorDrawer({ companyId, creditor, open, onOpenChange, onSuccess }: CreditorDrawerProps) {
  const [form, setForm] = useState<CreditorFormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!creditor?.id

  useEffect(() => {
    if (open) {
      setForm(creditor ? { name: creditor.name, creditor_type: creditor.creditor_type, country_code: creditor.country_code ?? undefined, email: creditor.email ?? '', phone: creditor.phone ?? '', notes: creditor.notes ?? '' } : emptyForm)
      setError(null)
    }
  }, [open, creditor])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = { ...form, email: form.email || undefined }
    startTransition(async () => {
      try {
        if (isEdit && creditor) {
          await updateCreditor(companyId, { ...payload, id: creditor.id })
          setForm(emptyForm)
          onOpenChange(false)
          onSuccess()
        } else {
          const { id } = await createCreditor(companyId, payload)
          setForm(emptyForm)
          onOpenChange(false)
          onSuccess(id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold text-white">{isEdit ? 'Modifier le créancier' : 'Nouveau créancier'}</SheetTitle>
          <p className="text-sm text-zinc-500">Centralise ici les contreparties qui portent tes obligations financières.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Creancier"
              entries={[
                { label: 'Nom', description: 'Nom de la contrepartie a payer.' },
                { label: 'Type', description: 'Classification pour faciliter filtres et analyses.' },
                { label: 'Coordonnees', description: 'Email, telephone, code pays pour le suivi operationnel.' },
              ]}
              results={[
                { label: 'Selection dans les dettes', description: 'Le creancier sera reutilisable dans les formulaires de dettes.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <p className="section-label">Identification</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={fieldClass} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Type</label><select value={form.creditor_type} onChange={(e) => setForm((p) => ({ ...p, creditor_type: e.target.value as CreditorFormData['creditor_type'] }))} className={fieldClass}>{CREDITOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Coordonnées</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Code pays</label><input type="text" value={form.country_code ?? ''} onChange={(e) => setForm((p) => ({ ...p, country_code: e.target.value.slice(0, 2) || undefined }))} maxLength={2} placeholder="FR" className={`${fieldClass} font-mono`} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Téléphone</label><input type="text" value={form.phone ?? ''} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={fieldClass} /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Email</label><input type="email" value={form.email ?? ''} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={fieldClass} /></div>
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
