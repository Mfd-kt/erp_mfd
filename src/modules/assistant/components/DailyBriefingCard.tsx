'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot } from 'lucide-react'

interface DailyBriefingCardProps {
  summary: string | null
  runDate?: string | null
}

export function DailyBriefingCard({ summary, runDate }: DailyBriefingCardProps) {
  if (!summary) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Bot size={18} />
            <span className="text-sm">Aucun briefing du jour. Le cron quotidien génère le briefing.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-amber-400" />
            <span className="font-medium text-zinc-100">Briefing du jour</span>
          </div>
          {runDate && (
            <Badge variant="outline" className="text-[10px]">
              {new Date(runDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Badge>
          )}
        </div>
        <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans">{summary}</pre>
      </CardContent>
    </Card>
  )
}
