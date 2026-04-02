'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserGuidanceDialog } from '@/components/ui/user-guidance-dialog'
import { sendToChannel } from '../index'

interface ChannelConfigFormProps {
  channelType: 'slack' | 'whatsapp'
  existing?: { id: string; config_json: Record<string, unknown>; is_active: boolean } | null
  configKeys: string[]
}

export function ChannelConfigForm({ channelType, existing, configKeys }: ChannelConfigFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const config: Record<string, string> = {}
    for (const k of configKeys) {
      const v = fd.get(k) as string
      if (v) config[k] = v
    }
    const { upsertNotificationChannel } = await import('../actions')
    await upsertNotificationChannel(channelType, config)
    setLoading(false)
    router.refresh()
  }

  async function handleTest() {
    const form = document.getElementById(`form-${channelType}`) as HTMLFormElement
    if (!form) return
    const fd = new FormData(form)
    const config: Record<string, string> = {}
    for (const k of configKeys) {
      const v = fd.get(k) as string
      if (v) config[k] = v
    }
    setTestResult(null)
    const result = await sendToChannel(channelType, config, {
      title: 'Test ERP MFD',
      message: 'Ceci est un message de test. Votre canal est configuré.',
    })
    setTestResult(result.success ? 'Envoyé ✓' : `Erreur: ${result.error}`)
  }

  return (
    <form id={`form-${channelType}`} onSubmit={handleSubmit} className="mt-4 space-y-4">
      <UserGuidanceDialog
        title="Aide - Configuration canal"
        entries={[
          { label: 'Parametres canal', description: 'Renseigne les cles requises (ex: webhook_url).' },
          { label: 'Tester', description: 'Envoie un message de test pour valider la configuration.' },
        ]}
        results={[
          { label: 'Envoi notifications', description: 'Le canal devient disponible pour les notifications automatiques.' },
        ]}
      />
      {configKeys.map((key) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            {key === 'webhook_url' ? 'Webhook URL' : key}
          </label>
          <input
            name={key}
            type={key === 'api_key' ? 'password' : 'text'}
            defaultValue={(existing?.config_json as Record<string, string>)?.[key]}
            placeholder={key === 'webhook_url' ? 'https://hooks.slack.com/...' : ''}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleTest}>
          Tester
        </Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
      {testResult && (
        <p className={`text-sm ${testResult.startsWith('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
          {testResult}
        </p>
      )}
    </form>
  )
}
