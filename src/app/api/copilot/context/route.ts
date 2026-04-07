import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCopilotContext, serializeCopilotContext } from '@/features/copilot/context'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const url = new URL(request.url)
  const conversationId = url.searchParams.get('conversationId')
  const q = url.searchParams.get('q') ?? ''

  const context = await buildCopilotContext({
    supabase,
    userId: user.id,
    conversationId,
    currentQuery: q,
  })

  return NextResponse.json({
    serialized: serializeCopilotContext(context),
    meta: context.meta,
    recommendationStats: context.recommendationStats,
    openRecommendations: context.openRecommendations,
    memoryItemCount: context.memoryItems.length,
    signalCount: context.behaviorSignals.length,
  })
}
