import type { SupabaseClient } from '@supabase/supabase-js'
import { logActivity } from '@/modules/activity/service'

/**
 * Auto-close tasks whose linked entity is resolved.
 * Call from a job or on plan generation.
 */
export async function autoCloseObsoleteTasks(supabase: SupabaseClient): Promise<number> {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, company_id, linked_entity_type, linked_entity_id')
    .in('status', ['todo', 'in_progress'])

  if (!tasks?.length) return 0

  let closed = 0
  const debtIds = tasks.filter((t) => t.linked_entity_type === 'debt' && t.linked_entity_id).map((t) => t.linked_entity_id!)
  const revenueIds = tasks.filter((t) => t.linked_entity_type === 'revenue' && t.linked_entity_id).map((t) => t.linked_entity_id!)

  const resolvedDebtIds = new Set<string>()
  const resolvedRevenueIds = new Set<string>()

  if (debtIds.length > 0) {
    const { data } = await supabase
      .from('debts_with_remaining')
      .select('id')
      .in('id', debtIds)
      .eq('computed_status', 'paid')
    for (const r of data ?? []) resolvedDebtIds.add(r.id)
  }

  if (revenueIds.length > 0) {
    const { data } = await supabase
      .from('revenues')
      .select('id, status, amount_expected, amount_received')
      .in('id', revenueIds)
    for (const r of data ?? []) {
      const received = Number(r.amount_received ?? 0)
      const expected = Number(r.amount_expected ?? 0)
      if (received >= expected || r.status === 'received') resolvedRevenueIds.add(r.id)
    }
  }

  for (const task of tasks) {
    let resolved = false
    let reason = ''
    if (task.linked_entity_type === 'debt' && task.linked_entity_id && resolvedDebtIds.has(task.linked_entity_id)) {
      resolved = true
      reason = 'Dette payée'
    }
    if (task.linked_entity_type === 'revenue' && task.linked_entity_id && resolvedRevenueIds.has(task.linked_entity_id)) {
      resolved = true
      reason = 'Revenu reçu'
    }
    if (!resolved) continue

    await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id)

    if (task.company_id) {
      await logActivity(supabase, {
        companyId: task.company_id,
        actionType: 'task_auto_completed',
        entityType: 'task',
        entityId: task.id,
        metadata: { reason, linked_entity_type: task.linked_entity_type },
      })
    }
    closed++
  }

  return closed
}
