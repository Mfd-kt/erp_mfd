'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Target, Bell } from 'lucide-react'

interface AssistantContextPanelProps {
  conversationId: string
}

export function AssistantContextPanel({ conversationId }: AssistantContextPanelProps) {
  const [recommendations, setRecommendations] = useState<{ id: string; title: string; severity: string }[]>([])

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/assistant/recommendations?limit=5`)
        const data = await res.json()
        setRecommendations(data.recommendations ?? [])
      } catch {
        // ignore
      }
    }
    fetchRecommendations()
  }, [conversationId])

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Contexte</h3>
          <div className="space-y-2 text-xs text-zinc-500">
            <p>Le copilote a accès aux données ERP via des outils sécurisés.</p>
            <p>Il ne peut pas modifier les données sans votre confirmation.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <Target size={14} />
            Actions rapides
          </h3>
          <div className="space-y-1">
            <Link href="/app/planning" className="block text-xs text-amber-400 hover:text-amber-300">
              Plan du jour
            </Link>
            <Link href="/app/alerts" className="block text-xs text-amber-400 hover:text-amber-300">
              Alertes groupe
            </Link>
            <Link href="/app/forecast" className="block text-xs text-amber-400 hover:text-amber-300">
              Prévision groupe
            </Link>
            <Link href="/app/tasks" className="block text-xs text-amber-400 hover:text-amber-300">
              Tâches
            </Link>
          </div>
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <Bell size={14} />
              Recommandations
            </h3>
            <div className="space-y-2">
              {recommendations.map((r) => (
                <Link
                  key={r.id}
                  href="/app/assistant/recommendations"
                  className="block text-xs text-zinc-400 hover:text-zinc-200"
                >
                  {r.title}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
