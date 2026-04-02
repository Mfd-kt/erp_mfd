'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Alert } from '@/modules/alerts/types'

/**
 * Create a task from an alert (overdue debt, revenue, forecast, etc.)
 */
export async function createTaskFromAlert(
  alert: Alert,
  options?: { title?: string; taskType?: 'important' | 'secondary' }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const title = options?.title ?? alert.title
  const taskType = options?.taskType ?? (alert.severity === 'critical' ? 'important' : 'secondary')

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      company_id: alert.companyId,
      sprint_id: null,
      scope_type: alert.companyId ? 'business' : 'global',
      title,
      description: alert.message,
      task_type: taskType,
      status: 'todo',
      priority: alert.severity === 'critical' ? 'high' : 'normal',
      due_date: null,
      energy_level: 'medium',
      linked_entity_type: alert.entityType,
      linked_entity_id: alert.entityId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/app/tasks')
  revalidatePath('/app/planning')
  if (alert.companyId) revalidatePath(`/app/${alert.companyId}/alerts`)
  revalidatePath('/app/alerts')
  return data
}
