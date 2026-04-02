import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task } from '@/modules/tasks/types'

/**
 * Filter out tasks that are obsolete (linked entity resolved).
 * Used when generating daily plan.
 */
export async function filterRelevantTasks(
  supabase: SupabaseClient,
  tasks: Task[]
): Promise<Task[]> {
  const linkedDebts = tasks
    .filter((t) => t.linked_entity_type === 'debt' && t.linked_entity_id)
    .map((t) => t.linked_entity_id!)
  const linkedRevenues = tasks
    .filter((t) => t.linked_entity_type === 'revenue' && t.linked_entity_id)
    .map((t) => t.linked_entity_id!)

  const resolvedDebtIds = new Set<string>()
  const resolvedRevenueIds = new Set<string>()

  if (linkedDebts.length > 0) {
    const { data } = await supabase
      .from('debts_with_remaining')
      .select('id')
      .in('id', linkedDebts)
      .eq('computed_status', 'paid')
    for (const r of data ?? []) resolvedDebtIds.add(r.id)
  }

  if (linkedRevenues.length > 0) {
    const { data } = await supabase
      .from('revenues')
      .select('id, status, amount_expected, amount_received')
      .in('id', linkedRevenues)
    for (const r of data ?? []) {
      const received = Number(r.amount_received ?? 0)
      const expected = Number(r.amount_expected ?? 0)
      if (received >= expected || r.status === 'received') resolvedRevenueIds.add(r.id)
    }
  }

  return tasks.filter((task) => {
    if (task.status === 'done' || task.status === 'cancelled') return false
    if (task.linked_entity_type === 'debt' && task.linked_entity_id && resolvedDebtIds.has(task.linked_entity_id))
      return false
    if (task.linked_entity_type === 'revenue' && task.linked_entity_id && resolvedRevenueIds.has(task.linked_entity_id))
      return false
    return true
  })
}
