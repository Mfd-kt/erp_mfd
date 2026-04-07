'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { executePendingAction, cancelPendingActionAction } from '../actions'
import { AlertCircle, Check, X } from 'lucide-react'
import Link from 'next/link'

interface PendingAction {
  id: string
  action_name: string
  action_payload_json: Record<string, unknown>
  created_at: string
}

function pendingSummary(actionName: string, payload: Record<string, unknown>): string {
  const title = typeof payload.title === 'string' ? payload.title : null
  if (actionName === 'create_task' && title) return `Créer la tâche « ${title} »`
  if (actionName === 'create_sprint' && title) return `Créer le sprint « ${title} »`
  if (actionName === 'send_slack_notification' && title) return `Notification Slack : ${title}`
  return actionName
}

export function PendingConfirmationsBanner() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingAction[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/assistant/pending-actions')
        const data = await res.json()
        setPending(data.pending ?? [])
      } catch {
        setPending([])
      }
    }
    fetchPending()
  }, [])

  async function handleConfirm(id: string) {
    setLoading(id)
    try {
      await executePendingAction(id)
      setPending((p) => p.filter((x) => x.id !== id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(null)
    }
  }

  async function handleCancel(id: string) {
    setLoading(id)
    try {
      await cancelPendingActionAction(id)
      setPending((p) => p.filter((x) => x.id !== id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(null)
    }
  }

  if (pending.length === 0) return null

  return (
    <Card className="border-amber-800/60 bg-amber-950/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">
              {pending.length} action{pending.length > 1 ? 's' : ''} en attente de confirmation
            </p>
            <div className="mt-2 space-y-2">
              {pending.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded border border-amber-800/40 bg-amber-950/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-amber-100">{pendingSummary(a.action_name, a.action_payload_json)}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-600 truncate">{a.action_name}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-emerald-400"
                      onClick={() => handleConfirm(a.id)}
                      disabled={loading === a.id}
                    >
                      <Check size={12} className="mr-1" /> Confirmer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-zinc-400"
                      onClick={() => handleCancel(a.id)}
                      disabled={loading === a.id}
                    >
                      <X size={12} className="mr-1" /> Annuler
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/app/assistant" className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300">
              Voir dans le copilote →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
