'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { createWebhook, updateWebhook } from '../actions'

const EVENTS = [
  { value: 'payment_created', label: 'Paiement créé' },
  { value: 'debt_overdue', label: 'Dette en retard' },
  { value: 'forecast_negative', label: 'Prévision négative' },
] as const
const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

interface Props {
  companyId: string
  webhook?: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function WebhookDrawer({ companyId, webhook, open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState({ id: undefined as string | undefined, event_type: 'payment_created', url: '', secret: '', is_active: true })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    if (webhook) setForm({ id: webhook.id, event_type: webhook.event_type, url: webhook.url, secret: webhook.secret ?? '', is_active: webhook.is_active ?? true })
    else setForm({ id: undefined, event_type: 'payment_created', url: '', secret: '', is_active: true })
    setError(null)
  }, [open, webhook])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const payload = { ...form, secret: form.secret || null }
        if (form.id) await updateWebhook(companyId, payload)
        else await createWebhook(companyId, payload)
        onOpenChange(false)
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold text-white">{form.id ? 'Modifier le webhook' : 'Nouveau webhook'}</SheetTitle>
          <p className="text-sm text-zinc-500">Configure une destination HTTP pour réagir aux événements métiers de l’ERP.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Webhook"
              entries={[
                { label: 'Evenement', description: 'Declencheur metier qui enverra une requete HTTP.' },
                { label: 'URL', description: 'Endpoint externe a appeler (https recommandé).' },
                { label: 'Secret', description: 'Optionnel, pour signer/verifier les appels.' },
              ]}
              results={[
                { label: 'Appel automatique', description: 'Le systeme pousse un payload a chaque evenement choisi.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <p className="section-label">Configuration</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Événement</label><select value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))} className={fieldClass}>{EVENTS.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">URL</label><input required value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." className={fieldClass} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Secret</label><input value={form.secret} onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))} className={fieldClass} /></div>
          </div>
          <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Webhook actif</label>
          {error ? <p className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p> : null}
          <SheetFooter>
            <Button type="button" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={isPending}>{isPending ? 'Enregistrement...' : form.id ? 'Enregistrer' : 'Créer'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
