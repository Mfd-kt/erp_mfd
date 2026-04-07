'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Target, Bell, ShieldAlert, ChevronRight } from 'lucide-react'

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

  const quickLinks = [
    { href: '/app/planning', label: 'Plan du jour' },
    { href: '/app/alerts', label: 'Alertes groupe' },
    { href: '/app/forecast', label: 'Prévision groupe' },
    { href: '/app/tasks', label: 'Tâches' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80 shadow-none">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-zinc-300">
            <ShieldAlert className="h-4 w-4 text-amber-500/90" aria-hidden />
            <h3 className="text-sm font-medium">Contexte</h3>
          </div>
          <div className="space-y-2 rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-2.5 text-xs leading-relaxed text-zinc-500">
            <p>Le copilote interroge l&apos;ERP via des outils sécurisés.</p>
            <p className="text-zinc-600">Aucune modification sans ta confirmation explicite.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80 shadow-none">
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Target className="h-4 w-4 text-amber-500/90" aria-hidden />
            Actions rapides
          </h3>
          <ul className="space-y-0.5">
            {quickLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center justify-between rounded-lg px-2 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-900/80 hover:text-amber-300"
                >
                  <span>{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500/80" />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card className="border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80 shadow-none">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Bell className="h-4 w-4 text-amber-500/90" aria-hidden />
              Recommandations
            </h3>
            <div className="space-y-2">
              {recommendations.map((r) => (
                <Link
                  key={r.id}
                  href="/app/assistant/recommendations"
                  className="block rounded-lg border border-transparent px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200"
                >
                  {r.title}
                  {r.severity ? (
                    <Badge variant="outline" className="ml-2 align-middle text-[9px] uppercase">
                      {r.severity}
                    </Badge>
                  ) : null}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
