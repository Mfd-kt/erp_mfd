'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import type { DebtType } from '@/lib/supabase/types'
import { createDebtType, updateDebtType } from '../actions'
import type { DebtTypeFormData } from '../schema'

interface DebtTypeDrawerProps {
  companyId: string
  debtType?: DebtType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (createdId?: string) => void
  /** Utiliser un Dialog centré (pour overlay depuis formulaire catégorie) */
  asDialog?: boolean
}

const emptyForm: DebtTypeFormData = { code: '', name: '', description: '' }
const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

export function DebtTypeDrawer({ companyId, debtType, open, onOpenChange, onSuccess, asDialog }: DebtTypeDrawerProps) {
  const [form, setForm] = useState<DebtTypeFormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!debtType?.id

  useEffect(() => {
    if (open) {
      setForm(debtType ? { code: debtType.code, name: debtType.name, description: debtType.description ?? '' } : emptyForm)
      setError(null)
    }
  }, [open, debtType])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = { ...form, description: form.description || undefined }
    startTransition(async () => {
      try {
        if (isEdit && debtType) {
          await updateDebtType(companyId, { ...payload, id: debtType.id })
          setForm(emptyForm)
          onOpenChange(false)
          onSuccess()
        } else {
          const { id } = await createDebtType(companyId, payload)
          setForm(emptyForm)
          onOpenChange(false)
          onSuccess(id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  const title = isEdit ? 'Modifier le type de dette' : 'Nouveau type de dette'
  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
      <UserGuidanceDialog
        title="Aide saisie - Type de dette"
        entries={[
          { label: 'Code', description: 'Code court unique (ex: OPEX, CAPEX).' },
          { label: 'Nom', description: 'Libelle metier de la famille de dettes.' },
        ]}
        results={[
          { label: 'Referentiel', description: 'Les categories de dette se rattachent a ces types.' },
        ]}
      />
      <div className="space-y-4">
        <p className="section-label">Structure</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Code *</label><input type="text" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required placeholder="OPEX" className={`${fieldClass} font-mono`} /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Charges d'exploitation" className={fieldClass} /></div>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Description</label><textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={`${fieldClass} resize-none`} /></div>
      </div>
      {error ? <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p> : null}
      <div className="mt-2 flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
        <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>{isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}</Button>
      </div>
    </form>
  )

  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-white">{title}</DialogTitle>
            <p className="text-sm text-zinc-500">Définis ici les grandes familles de dettes qui structurent tout le référentiel financier.</p>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold text-white">{title}</SheetTitle>
          <p className="text-sm text-zinc-500">Définis ici les grandes familles de dettes qui structurent tout le référentiel financier.</p>
        </SheetHeader>
        {formContent}
      </SheetContent>
    </Sheet>
  )
}
