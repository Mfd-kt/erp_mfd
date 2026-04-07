'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { postponeRecommendation, updateRecommendationStatus } from '../actions'
import type { AssistantRecommendation } from '../types'
import { Check, Clock, X } from 'lucide-react'

interface RecommendationCardProps {
  recommendation: AssistantRecommendation
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const router = useRouter()

  async function handleAccept() {
    await updateRecommendationStatus(recommendation.id, 'accepted')
    router.refresh()
  }

  async function handleDismiss() {
    await updateRecommendationStatus(recommendation.id, 'dismissed')
    router.refresh()
  }

  async function handlePostpone() {
    await postponeRecommendation(recommendation.id)
    router.refresh()
  }

  const severityVariant = recommendation.severity === 'critical' ? 'destructive' : recommendation.severity === 'warning' ? 'secondary' : 'outline'

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-zinc-100">{recommendation.title}</p>
            {recommendation.body && (
              <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{recommendation.body}</p>
            )}
            <Badge variant={severityVariant} className="mt-2 text-[10px]">
              {recommendation.severity}
            </Badge>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-emerald-400" onClick={handleAccept} title="Accepter">
              <Check size={12} />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-amber-400/90" onClick={handlePostpone} title="Reporter (décision)">
              <Clock size={12} />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-zinc-400" onClick={handleDismiss} title="Ignorer">
              <X size={12} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
