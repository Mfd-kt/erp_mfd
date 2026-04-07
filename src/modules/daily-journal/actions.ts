'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { createTask } from '@/modules/tasks/actions'
import { extractTaskTitlesFromMarkdown } from './journal-ai-run'
import { upsertJournalEntrySchema } from './schema'
import type { JournalEnergyLevel, MoodLevel } from './types'

function emptyToNull(s: string | undefined | null): string | null {
  if (s == null || s.trim() === '') return null
  return s
}

export async function upsertJournalEntry(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const scope = await getAccessScope()
  if (!scope) return { error: 'Non authentifié' }

  const raw = {
    journal_date: formData.get('journal_date')?.toString() ?? '',
    mood: formData.get('mood')?.toString(),
    energy_level: formData.get('energy_level')?.toString(),
    accomplished: formData.get('accomplished')?.toString() ?? '',
    what_failed: formData.get('what_failed')?.toString() ?? '',
    intentions_tomorrow: formData.get('intentions_tomorrow')?.toString() ?? '',
    overall_rating: formData.get('overall_rating')?.toString() ?? '',
  }

  const parsed = upsertJournalEntrySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { error: first }
  }

  const v = parsed.data
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase.from('daily_journal_entries').upsert(
    {
      user_id: scope.userId,
      journal_date: v.journal_date,
      mood: v.mood as MoodLevel,
      energy_level: v.energy_level as JournalEnergyLevel,
      accomplished: emptyToNull(v.accomplished),
      what_failed: emptyToNull(v.what_failed),
      intentions_tomorrow: emptyToNull(v.intentions_tomorrow),
      overall_rating: v.overall_rating,
      updated_at: now,
    },
    { onConflict: 'user_id,journal_date' }
  )

  if (error) return { error: error.message }

  revalidatePath('/app/journal')
  revalidatePath(`/app/journal/${v.journal_date}`)
  return { success: true }
}

/**
 * Crée des tâches personnelles (module Tâches) à partir du texte d’analyse IA.
 */
export async function createTasksFromJournalAnalysis(
  markdown: string
): Promise<{ success: true; count: number } | { error: string }> {
  const scope = await getAccessScope()
  if (!scope) return { error: 'Non authentifié' }
  const t = markdown.trim()
  if (t.length < 40) return { error: 'Texte trop court pour en déduire des tâches.' }

  let titles: string[]
  try {
    titles = await extractTaskTitlesFromMarkdown(t)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Extraction impossible.' }
  }

  if (titles.length === 0) {
    return { error: 'Aucune tâche détectée. Relance une analyse plus orientée actions.' }
  }

  for (const title of titles) {
    await createTask({
      scope_type: 'personal',
      assigned_to_user_id: scope.userId,
      title: title.slice(0, 500),
      task_type: 'important',
      priority: 'high',
      status: 'todo',
      energy_level: 'medium',
    })
  }

  revalidatePath('/app/journal')
  return { success: true, count: titles.length }
}
