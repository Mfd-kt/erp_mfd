'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import type { DebtCategory, DebtType } from '@/lib/supabase/types'
import { createDebtCategory, updateDebtCategory } from '../actions'
import { DebtTypeDrawer } from '@/modules/debt-types/components/DebtTypeDrawer'
import type { DebtCategoryFormData } from '../schema'

interface DebtCategoryDrawerProps {
  companyId: string
  debtTypes: DebtType[]
  debtCategory?: (DebtCategory & { debt_types?: DebtType }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (createdId?: string) => void
  /** Rafraîchir les données (ex. après création d'un type) */
  onRefresh?: () => void
  /** Utiliser un Dialog centré au lieu d'un Sheet (pour overlay depuis formulaire dette) */
  asDialog?: boolean
}

const emptyForm: Omit<DebtCategoryFormData, 'debt_type_id'> = { code: '', name: '', description: '', is_payroll: false, is_recurring_default: false }
const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

function DebtCategoryForm({
  form,
  setForm,
  debtTypes,
  debtCategory,
  error,
  isPending,
  onOpenChange,
  onOpenTypeOverlay,
  handleSubmit,
}: {
  form: DebtCategoryFormData
  setForm: React.Dispatch<React.SetStateAction<DebtCategoryFormData>>
  debtTypes: DebtType[]
  debtCategory: (DebtCategory & { debt_types?: DebtType }) | null | undefined
  error: string | null
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onOpenTypeOverlay?: () => void
  handleSubmit: (e: React.FormEvent) => void
}) {
  const isEdit = !!debtCategory?.id
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
      <UserGuidanceDialog
        title="Aide saisie - Categorie de dette"
        entries={[
          { label: 'Type de dette', description: 'Famille metier parent de la categorie.' },
          { label: 'Code / Nom', description: 'Identification unique et lisible de la categorie.' },
          { label: 'Recurrent par defaut', description: 'Pre-selection pour les flux recurrents si active.' },
        ]}
        results={[
          { label: 'Filtres dettes', description: 'Permet une lecture analytique plus fine des dettes.' },
        ]}
      />
      <div className="space-y-4">
        <p className="section-label">Classification</p>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Type de dette *</label>
          <div className="flex gap-2">
            <select value={form.debt_type_id} onChange={(e) => setForm((p) => ({ ...p, debt_type_id: e.target.value }))} required className={fieldClass}><option value="">Sélectionner...</option>{(debtTypes ?? []).map((dt) => <option key={dt.id} value={dt.id}>{dt.code} — {dt.name}</option>)}</select>
            {onOpenTypeOverlay && <Button type="button" variant="outline" size="icon" className="shrink-0 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={onOpenTypeOverlay} title="Créer un type de dette"><Plus size={16} /></Button>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Code *</label><input type="text" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required placeholder="RENT" className={`${fieldClass} font-mono`} /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Loyer" className={fieldClass} /></div>
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="section-label">Paramètres</p>
        <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Description</label><textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={`${fieldClass} resize-none`} /></div>
        <div className="space-y-1">
          <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.is_payroll} onChange={(e) => setForm((p) => ({ ...p, is_payroll: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Catégorie paie / salaires</label>
          <p className="pl-7 text-xs text-zinc-500">A cocher pour les charges RH (salaires, primes, charges sociales) afin de les identifier rapidement dans les analyses.</p>
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.is_recurring_default} onChange={(e) => setForm((p) => ({ ...p, is_recurring_default: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Récurrent par défaut</label>
          <p className="pl-7 text-xs text-zinc-500">A cocher si cette catégorie sert souvent à des dépenses mensuelles/trimestrielles, pour la proposer par défaut dans les règles récurrentes.</p>
        </div>
      </div>
      {error ? <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p> : null}
      <div className="mt-2 flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
        <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>{isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}</Button>
      </div>
    </form>
  )
}

export function DebtCategoryDrawer({ companyId, debtTypes, debtCategory, open, onOpenChange, onSuccess, onRefresh, asDialog }: DebtCategoryDrawerProps) {
  const [form, setForm] = useState<DebtCategoryFormData>({ ...emptyForm, debt_type_id: (debtTypes ?? [])[0]?.id ?? '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [typeOverlayOpen, setTypeOverlayOpen] = useState(false)
  const isEdit = !!debtCategory?.id

  useEffect(() => {
    if (open) {
      setForm(debtCategory ? { debt_type_id: debtCategory.debt_type_id, code: debtCategory.code, name: debtCategory.name, description: debtCategory.description ?? '', is_payroll: debtCategory.is_payroll, is_recurring_default: debtCategory.is_recurring_default } : { ...emptyForm, debt_type_id: (debtTypes ?? [])[0]?.id ?? '' })
      setError(null)
    }
  }, [open, debtCategory, debtTypes])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = { ...form, description: form.description || undefined }
    startTransition(async () => {
      try {
        if (isEdit && debtCategory) {
          await updateDebtCategory(companyId, { ...payload, id: debtCategory.id })
            setForm({ ...emptyForm, debt_type_id: (debtTypes ?? [])[0]?.id ?? '' })
          onOpenChange(false)
          onSuccess()
        } else {
          const { id } = await createDebtCategory(companyId, payload)
            setForm({ ...emptyForm, debt_type_id: (debtTypes ?? [])[0]?.id ?? '' })
          onOpenChange(false)
          onSuccess(id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    })
  }

  const title = isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie de dette'
  const formContent = (
    <DebtCategoryForm form={form} setForm={setForm} debtTypes={debtTypes} debtCategory={debtCategory} error={error} isPending={isPending} onOpenChange={onOpenChange} onOpenTypeOverlay={onRefresh ? () => setTypeOverlayOpen(true) : undefined} handleSubmit={handleSubmit} />
  )

  if (asDialog) {
    return (
      <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-white">{title}</DialogTitle>
            <p className="text-sm text-zinc-500">Relie chaque catégorie à un type métier clair pour rendre la lecture analytique immédiate.</p>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
      {onRefresh && (
        <DebtTypeDrawer
          companyId={companyId}
          open={typeOverlayOpen}
          onOpenChange={setTypeOverlayOpen}
          onSuccess={(createdId) => {
            setTypeOverlayOpen(false)
            if (createdId) {
              setForm((p) => ({ ...p, debt_type_id: createdId }))
              onRefresh()
            }
          }}
          asDialog
        />
      )}
      </>
    )
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold text-white">{title}</SheetTitle>
          <p className="text-sm text-zinc-500">Relie chaque catégorie à un type métier clair pour rendre la lecture analytique immédiate.</p>
        </SheetHeader>
        {formContent}
      </SheetContent>
    </Sheet>
    {onRefresh && (
      <DebtTypeDrawer
        companyId={companyId}
        open={typeOverlayOpen}
        onOpenChange={setTypeOverlayOpen}
        onSuccess={(createdId) => {
          setTypeOverlayOpen(false)
          if (createdId) {
            setForm((p) => ({ ...p, debt_type_id: createdId }))
            onRefresh()
          }
        }}
        asDialog
      />
    )}
    </>
  )
}
