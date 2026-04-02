import { createClient } from '@/lib/supabase/server'
import type { Task } from './types'

export interface TaskFilters {
  status?: string
  scope_type?: string
  company_id?: string
  sprint_id?: string
  task_type?: string
  assigned_to_user_id?: string
}

export type TaskWithSprintTitle = Task & {
  sprint_title?: string | null
}

export interface GroupTasksDashboardData {
  counts: {
    open: number
    todo: number
    in_progress: number
    done: number
    total_non_cancelled: number
  }
  by_company: Record<string, { open: number; todo: number; in_progress: number; done: number }>
  upcoming: TaskWithSprintTitle[]
}

export function buildGroupTaskCounts(rows: Array<{ company_id: string | null; status: Task['status'] }>) {
  const counts = {
    open: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
    total_non_cancelled: 0,
  }
  const by_company: Record<string, { open: number; todo: number; in_progress: number; done: number }> = {}

  for (const row of rows) {
    if (row.status === 'cancelled') continue
    counts.total_non_cancelled += 1
    if (row.status === 'todo') counts.todo += 1
    if (row.status === 'in_progress') counts.in_progress += 1
    if (row.status === 'done') counts.done += 1
    if (row.status === 'todo' || row.status === 'in_progress') counts.open += 1

    const key = row.company_id ?? '__global__'
    const prev = by_company[key] ?? { open: 0, todo: 0, in_progress: 0, done: 0 }
    if (row.status === 'todo') prev.todo += 1
    if (row.status === 'in_progress') prev.in_progress += 1
    if (row.status === 'done') prev.done += 1
    if (row.status === 'todo' || row.status === 'in_progress') prev.open += 1
    by_company[key] = prev
  }

  return { counts, by_company }
}

export async function getTasks(filters?: TaskFilters): Promise<TaskWithSprintTitle[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('*, sprints(title)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.scope_type) query = query.eq('scope_type', filters.scope_type)
  if (filters?.company_id) query = query.eq('company_id', filters.company_id)
  if (filters?.sprint_id) query = query.eq('sprint_id', filters.sprint_id)
  if (filters?.task_type) query = query.eq('task_type', filters.task_type)
  if (filters?.assigned_to_user_id) query = query.eq('assigned_to_user_id', filters.assigned_to_user_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as (Task & { sprints?: { title: string } | null })[]
  return rows.map((row) => {
    const { sprints, ...rest } = row
    return {
      ...(rest as Task),
      sprint_title: sprints?.title ?? null,
    }
  })
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()
  if (error || !data) return null
  return data as Task
}

export async function getTasksBySprint(sprintId: string): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('sprint_id', sprintId)
    .neq('status', 'cancelled')
    .order('task_type', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Task[]
}

/**
 * Group dashboard digest for tasks.
 * Includes tasks attached to group companies and "global" tasks (company_id null).
 */
export async function getTasksForGroupDashboard(
  companyIds: string[],
  options?: { limit?: number }
): Promise<GroupTasksDashboardData> {
  const supabase = await createClient()
  const limit = options?.limit ?? 8
  const scopeFilter = companyIds.length > 0
    ? `company_id.in.(${companyIds.join(',')}),company_id.is.null`
    : 'company_id.is.null'

  let query = supabase
    .from('tasks')
    .select('*, sprints(title)')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  query = query.or(scopeFilter)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as (Task & { sprints?: { title: string } | null })[]
  const upcoming = rows.map((row) => {
    const { sprints, ...rest } = row
    return {
      ...(rest as Task),
      sprint_title: sprints?.title ?? null,
    }
  })

  const { data: statsRows, error: statsError } = await supabase
    .from('tasks')
    .select('company_id, status')
    .or(scopeFilter)
  if (statsError) throw new Error(statsError.message)

  const { counts, by_company } = buildGroupTaskCounts(
    ((statsRows ?? []) as Array<{ company_id: string | null; status: Task['status'] }>)
  )

  return { counts, by_company, upcoming }
}
