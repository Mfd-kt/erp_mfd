import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/modules/tasks/types'

export interface DailyPlan {
  id: string
  user_id: string
  plan_date: string
  primary_task_id: string | null
  secondary_task_1_id: string | null
  secondary_task_2_id: string | null
  notes: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface DailyPlanWithTasks extends DailyPlan {
  primary_task?: Task | null
  secondary_task_1?: Task | null
  secondary_task_2?: Task | null
  plan_metadata?: { primary?: string; secondary1?: string; secondary2?: string }
}

export async function getDailyPlan(
  userId: string,
  planDate: string,
  supabase?: SupabaseClient
): Promise<DailyPlanWithTasks | null> {
  const client = supabase ?? (await createClient())
  const { data: plan, error } = await client
    .from('daily_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  if (!plan) return null

  const taskIds = [plan.primary_task_id, plan.secondary_task_1_id, plan.secondary_task_2_id].filter(Boolean) as string[]
  let primary_task: Task | null = null
  let secondary_task_1: Task | null = null
  let secondary_task_2: Task | null = null

  if (taskIds.length > 0) {
    const { data: tasks } = await client.from('tasks').select('*').in('id', taskIds)
    const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]))
    primary_task = plan.primary_task_id ? (taskMap.get(plan.primary_task_id) as Task) ?? null : null
    secondary_task_1 = plan.secondary_task_1_id ? (taskMap.get(plan.secondary_task_1_id) as Task) ?? null : null
    secondary_task_2 = plan.secondary_task_2_id ? (taskMap.get(plan.secondary_task_2_id) as Task) ?? null : null
  }

  return { ...plan, primary_task, secondary_task_1, secondary_task_2 }
}

export async function upsertDailyPlan(
  userId: string,
  planDate: string,
  plan: {
    primary_task_id?: string | null
    secondary_task_1_id?: string | null
    secondary_task_2_id?: string | null
    notes?: string | null
    status?: string
    plan_metadata?: Record<string, string>
  },
  supabase?: SupabaseClient
) {
  const client = supabase ?? (await createClient())
  const { data, error } = await client
    .from('daily_plans')
    .upsert(
      {
        user_id: userId,
        plan_date: planDate,
        ...plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,plan_date' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
