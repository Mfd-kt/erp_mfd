/**
 * Agrégation contrôlée : règles explicites, scores, pas d’entraînement LLM opaque.
 * Appelé après un tour de conversation ou via tâche planifiée (à brancher plus tard).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ensureUserProfileRow,
  fetchRecommendationStats,
  fetchUserProfile,
  hasRecentActiveSignal,
  insertBehaviorSignal,
  updateUserProfile,
} from './repository'
import type { RecommendationStatusStats } from './types'
import { isSyntheticCopilotProfile } from './schema-availability'

const LEARNING_META_KEY = 'controlled_learning'

interface LearningMeta {
  recommendationStats?: RecommendationStatusStats
  lastAggregatedAt?: string
}

function readLearningMeta(metadata: Record<string, unknown>): LearningMeta {
  const raw = metadata[LEARNING_META_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as LearningMeta
}

export async function runControlledLearningAggregate(supabase: SupabaseClient, userId: string): Promise<void> {
  await ensureUserProfileRow(supabase, userId)
  const profile = await fetchUserProfile(supabase, userId)
  if (!profile || isSyntheticCopilotProfile(profile)) return

  const stats = await fetchRecommendationStats(supabase, userId)
  const baseMeta = profile.metadata ?? {}
  const learning = readLearningMeta(baseMeta)
  const nextMeta: Record<string, unknown> = {
    ...baseMeta,
    [LEARNING_META_KEY]: {
      ...learning,
      recommendationStats: stats,
      lastAggregatedAt: new Date().toISOString(),
    },
  }

  await updateUserProfile(supabase, userId, { metadata: nextMeta, last_profile_update_at: new Date().toISOString() })

  await applyExplicitSignalRules(supabase, userId, stats)
}

async function applyExplicitSignalRules(
  supabase: SupabaseClient,
  userId: string,
  stats: RecommendationStatusStats
): Promise<void> {
  if (stats.open >= 8) {
    const dup = await hasRecentActiveSignal(supabase, userId, 'many_open_recommendations', 10)
    if (!dup) {
      await insertBehaviorSignal(supabase, {
        userId,
        signalType: 'many_open_recommendations',
        severity: 'warning',
        description:
          'Tu as un volume élevé de recommandations encore ouvertes. À traiter ou à clôturer explicitement pour garder de la clarté.',
        supportingData: { openCount: stats.open, rule: 'open>=8' },
      })
    }
  }

  const dismissed = stats.dismissed
  const accepted = stats.accepted
  if (dismissed >= 4 && dismissed > accepted * 2) {
    const dup = await hasRecentActiveSignal(supabase, userId, 'recommendations_often_dismissed', 14)
    if (!dup) {
      await insertBehaviorSignal(supabase, {
        userId,
        signalType: 'recommendations_often_dismissed',
        severity: 'attention',
        description:
          'Sur l’historique disponible, beaucoup de recommandations sont ignorées par rapport à celles suivies. Vérifie si le format des propositions colle à ton mode de décision — ou si certaines ne sont plus pertinentes.',
        supportingData: {
          dismissed,
          accepted,
          rule: 'dismissed>=4 && dismissed>accepted*2',
        },
      })
    }
  }
}
