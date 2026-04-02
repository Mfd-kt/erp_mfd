'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { updateNotificationPreferences, sendTestNotification } from '../actions'
import type { NotificationPreferences } from '../queries'

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
)

interface NotificationPreferencesFormProps {
  initial: NotificationPreferences
}

export function NotificationPreferencesForm({ initial }: NotificationPreferencesFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const [morningTime, setMorningTime] = useState(initial.morning_time?.slice(0, 5) ?? '08:00')
  const [eveningTime, setEveningTime] = useState(initial.evening_time?.slice(0, 5) ?? '18:00')
  const [slackEnabled, setSlackEnabled] = useState(
    (initial.channels_enabled ?? ['slack']).includes('slack')
  )
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    (initial.channels_enabled ?? []).includes('whatsapp')
  )
  const [enableDailyPlan, setEnableDailyPlan] = useState(initial.enable_daily_plan ?? true)
  const [enableOverdueAlerts, setEnableOverdueAlerts] = useState(initial.enable_overdue_alerts ?? true)
  const [enableSprintAlerts, setEnableSprintAlerts] = useState(initial.enable_sprint_alerts ?? true)

  async function handleSave() {
    setSaving(true)
    try {
      const channels: string[] = []
      if (slackEnabled) channels.push('slack')
      if (whatsappEnabled) channels.push('whatsapp')
      if (channels.length === 0) channels.push('slack')

      await updateNotificationPreferences({
        morning_time: morningTime,
        evening_time: eveningTime,
        channels_enabled: channels,
        enable_daily_plan: enableDailyPlan,
        enable_overdue_alerts: enableOverdueAlerts,
        enable_sprint_alerts: enableSprintAlerts,
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleTestNotification() {
    setTestResult(null)
    const result = await sendTestNotification()
    setTestResult(result.success ? 'Envoyé ✓' : `Erreur: ${result.error ?? 'inconnue'}`)
  }

  return (
    <div className="space-y-6">
      <UserGuidanceDialog
        title="Aide - Preferences notifications"
        entries={[
          { label: 'Heures matin/soir', description: 'Planification des envois automatiques.' },
          { label: 'Canaux actives', description: 'Slack / WhatsApp utilises pour les messages.' },
          { label: 'Types alertes', description: 'Choix des categories de notifications a recevoir.' },
        ]}
        results={[
          { label: 'Diffusion automatique', description: 'Les notifications suivent ces reglages des la sauvegarde.' },
        ]}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Heure du plan du matin
          </label>
          <select
            value={morningTime}
            onChange={(e) => setMorningTime(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Heure du résumé du soir
          </label>
          <select
            value={eveningTime}
            onChange={(e) => setEveningTime(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Canaux activés
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={slackEnabled}
              onChange={(e) => setSlackEnabled(e.target.checked)}
              className="rounded border-zinc-600"
            />
            <span className="text-sm text-zinc-300">Slack</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
              className="rounded border-zinc-600"
            />
            <span className="text-sm text-zinc-300">WhatsApp</span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableDailyPlan}
            onChange={(e) => setEnableDailyPlan(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-sm text-zinc-300">Plan du jour (matin)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableOverdueAlerts}
            onChange={(e) => setEnableOverdueAlerts(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-sm text-zinc-300">Alertes tâches en retard</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableSprintAlerts}
            onChange={(e) => setEnableSprintAlerts(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-sm text-zinc-300">Alertes sprint</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleTestNotification}>
          Tester une notification
        </Button>
      </div>

      {testResult && (
        <p className={`text-sm ${testResult.startsWith('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
          {testResult}
        </p>
      )}
    </div>
  )
}
