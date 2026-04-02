'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { CurrencySelectOptional } from '@/components/ui/currency-select'
import { normalizeOptionalCurrencyFilter } from '@/lib/currencies'
import { createAutomationRule, updateAutomationRule } from '../actions'

const TRIGGERS = [
  { value: 'debt_overdue', label: 'Dette en retard' },
  { value: 'revenue_overdue', label: 'Revenu en retard' },
  { value: 'low_cash_forecast', label: 'Trésorerie faible' },
  { value: 'recurring_generated', label: 'Règle récurrente générée' },
  { value: 'payment_created', label: 'Paiement créé' },
] as const
const ACTIONS = [
  { value: 'create_notification', label: 'Créer une notification' },
  { value: 'create_alert', label: 'Créer une alerte' },
  { value: 'trigger_webhook', label: 'Déclencher un webhook' },
] as const
const PRIORITIES = [
  { value: '', label: 'Toutes' },
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Haute' },
  { value: 'normal', label: 'Normale' },
  { value: 'low', label: 'Basse' },
] as const
const NOTIF_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'critical', label: 'Critique' },
  { value: 'success', label: 'Succès' },
] as const
const SEVERITIES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'critical', label: 'Critique' },
] as const

const fieldClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-700'

interface Props {
  companyId: string
  rule?: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AutomationRuleDrawer({ companyId, rule, open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    name: '',
    trigger_type: 'payment_created',
    min_amount: '',
    priority: '',
    currency_code: '',
    action_type: 'create_notification' as 'create_notification' | 'create_alert' | 'trigger_webhook',
    action_title: '',
    action_message: '',
    notification_type: 'info',
    severity: 'warning',
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    if (rule) {
      setForm({
        id: rule.id,
        name: rule.name,
        trigger_type: rule.trigger_type,
        min_amount: rule.condition_json?.min_amount?.toString?.() ?? '',
        priority: rule.condition_json?.priority ?? '',
        currency_code: normalizeOptionalCurrencyFilter(rule.condition_json?.currency_code as string | undefined),
        action_type: rule.action_json?.type ?? 'create_notification',
        action_title: rule.action_json?.title ?? '',
        action_message: rule.action_json?.message ?? '',
        notification_type: rule.action_json?.notification_type ?? 'info',
        severity: rule.action_json?.severity ?? 'warning',
        is_active: rule.is_active ?? true,
      })
    } else {
      setForm({ id: undefined, name: '', trigger_type: 'payment_created', min_amount: '', priority: '', currency_code: '', action_type: 'create_notification', action_title: '', action_message: '', notification_type: 'info', severity: 'warning', is_active: true })
    }
    setError(null)
  }, [open, rule])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          id: form.id,
          name: form.name,
          trigger_type: form.trigger_type,
          min_amount: form.min_amount ? Number(form.min_amount) : null,
          priority: form.priority || null,
          currency_code: form.currency_code || null,
          action_type: form.action_type,
          action_title: form.action_title || null,
          action_message: form.action_message || null,
          notification_type: form.notification_type as 'info' | 'warning' | 'critical' | 'success',
          severity: form.severity as 'info' | 'warning' | 'critical',
          is_active: form.is_active,
        }
        if (form.id) await updateAutomationRule(companyId, payload)
        else await createAutomationRule(companyId, payload)
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
          <SheetTitle className="text-2xl font-semibold text-white">{form.id ? 'Modifier la règle' : 'Nouvelle règle d’automatisation'}</SheetTitle>
          <p className="text-sm text-zinc-500">Définis un déclencheur, des conditions métier et une action automatique lisible.</p>
          <div className="pt-2">
            <UserGuidanceDialog
              title="Aide saisie - Regle d automatisation"
              entries={[
                { label: 'Declencheur', description: 'Evenement qui active la regle.' },
                { label: 'Conditions', description: 'Filtres (montant, priorite, devise) pour cibler les cas utiles.' },
                { label: 'Action', description: 'Notification, alerte, ou webhook execute automatiquement.' },
              ]}
              results={[
                { label: 'Execution automatique', description: 'Quand les conditions matchent, l action est lancee sans intervention manuelle.' },
              ]}
            />
          </div>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <p className="section-label">Déclencheur</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Nom *</label><input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={fieldClass} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Type de déclencheur *</label><select value={form.trigger_type} onChange={(e) => setForm((p) => ({ ...p, trigger_type: e.target.value }))} className={fieldClass}>{TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Conditions</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Montant min</label><input type="number" value={form.min_amount} onChange={(e) => setForm((p) => ({ ...p, min_amount: e.target.value }))} className={fieldClass} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Priorité</label><select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className={fieldClass}>{PRIORITIES.map((p) => <option key={p.value || 'all'} value={p.value}>{p.label}</option>)}</select></div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Devise</label>
                <CurrencySelectOptional
                  value={form.currency_code}
                  onChange={(code) => setForm((p) => ({ ...p, currency_code: code }))}
                  className={`${fieldClass} font-mono`}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="section-label">Action</p>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Type d’action *</label><select value={form.action_type} onChange={(e) => setForm((p) => ({ ...p, action_type: e.target.value as any }))} className={fieldClass}>{ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Titre</label><input value={form.action_title} onChange={(e) => setForm((p) => ({ ...p, action_title: e.target.value }))} className={fieldClass} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Message</label><textarea value={form.action_message} onChange={(e) => setForm((p) => ({ ...p, action_message: e.target.value }))} rows={3} className={`${fieldClass} resize-none`} /></div>
            {form.action_type === 'create_notification' ? <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Type de notification</label><select value={form.notification_type} onChange={(e) => setForm((p) => ({ ...p, notification_type: e.target.value }))} className={fieldClass}>{NOTIF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div> : null}
            {form.action_type === 'create_alert' ? <div className="space-y-2"><label className="text-sm font-medium text-zinc-300">Sévérité</label><select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))} className={fieldClass}>{SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div> : null}
          </div>
          <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded border-zinc-700 bg-zinc-900" /> Règle active</label>
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
