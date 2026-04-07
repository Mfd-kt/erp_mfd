import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchOpenRecommendationsPreview, fetchRecommendationStats } from './repository'
import type { RecommendationStatusStats } from './types'

export async function getRecommendationStatsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<RecommendationStatusStats> {
  return fetchRecommendationStats(supabase, userId)
}

export async function getOpenRecommendationsPreviewForUser(
  supabase: SupabaseClient,
  userId: string,
  limit?: number
) {
  return fetchOpenRecommendationsPreview(supabase, userId, limit)
}
