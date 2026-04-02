import { createClient } from '@/lib/supabase/server'
import type { Sprint, SprintWithProgress } from './types'

export interface SprintFilters {
  status?: string
  scope_type?: string
  company_id?: string
}

export async function getSprints(filters?: SprintFilters): Promise<Sprint[]> {
  const supabase = await createClient()
  let query = supabase
    .from('sprints')
    .select('*')
    .order('start_date', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.scope_type) query = query.eq('scope_type', filters.scope_type)
  if (filters?.company_id) query = query.eq('company_id', filters.company_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Sprint[]
}

export async function getSprintsForGroupDashboard(companyIds: string[], limit = 3): Promise<Sprint[]> {
  const supabase = await createClient()
  const scopeFilter = companyIds.length > 0
    ? `company_id.in.(${companyIds.join(',')}),company_id.is.null`
    : 'company_id.is.null'

  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .in('status', ['active', 'planned'])
    .or(scopeFilter)
    .order('start_date', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as Sprint[]
}

export async function getSprintById(sprintId: string): Promise<Sprint | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('id', sprintId)
    .single()
  if (error || !data) return null
  return data as Sprint
}

export async function getSprintWithProgress(sprintId: string): Promise<SprintWithProgress | null> {
  const supabase = await createClient()
  const { data: sprint, error: sprintError } = await supabase
    .from('sprints')
    .select('*')
    .eq('id', sprintId)
    .single()
  if (sprintError || !sprint) return null

  const { count: total } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('sprint_id', sprintId)
    .neq('status', 'cancelled')

  const { count: completed } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('sprint_id', sprintId)
    .eq('status', 'done')

  const totalTasks = total ?? 0
  const completedTasks = completed ?? 0
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    ...(sprint as Sprint),
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    progress_percent: progressPercent,
  }
}
