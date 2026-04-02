'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { taskSchema, updateTaskSchema, updateTaskStatusSchema } from './schema'
import type { TaskFormData, UpdateTaskFormData } from './schema'

const updateNextStepCommentSchema = z.object({
  id: z.string().uuid(),
  next_step_comment: z.string().max(2000).nullable(),
})

export async function createTask(formData: TaskFormData) {
  const parsed = taskSchema.parse(formData)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      company_id: parsed.company_id ?? null,
      assigned_to_user_id: parsed.assigned_to_user_id ?? null,
      sprint_id: parsed.sprint_id ?? null,
      scope_type: parsed.scope_type,
      title: parsed.title,
      description: parsed.description ?? null,
      next_step_comment: parsed.next_step_comment ?? null,
      task_type: parsed.task_type,
      status: parsed.status,
      priority: parsed.priority,
      due_date: parsed.due_date ?? null,
      due_time: parsed.due_time ?? null,
      end_date: parsed.end_date ?? null,
      end_time: parsed.end_time ?? null,
      estimated_minutes: parsed.estimated_minutes ?? null,
      energy_level: parsed.energy_level,
      linked_entity_type: parsed.linked_entity_type ?? null,
      linked_entity_id: parsed.linked_entity_id ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/app/tasks')
  revalidatePath('/app/planning')
  if (parsed.sprint_id) revalidatePath(`/app/sprints/${parsed.sprint_id}`)
  return data
}

export async function updateTask(formData: UpdateTaskFormData) {
  const parsed = updateTaskSchema.parse(formData)
  const supabase = await createClient()
  const { id, ...rest } = parsed
  const { data: existing, error: fetchErr } = await supabase.from('tasks').select('status').eq('id', id).single()
  if (fetchErr) throw new Error(fetchErr.message)

  const updatePayload: Record<string, unknown> = { ...rest }
  if (rest.status !== undefined && rest.status !== existing.status) {
    if (rest.status === 'done') {
      updatePayload.completed_at = new Date().toISOString()
    } else {
      updatePayload.completed_at = null
    }
  }

  const { data, error } = await supabase.from('tasks').update(updatePayload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/app/tasks')
  revalidatePath('/app/planning')
  revalidatePath('/app/sprints', 'layout')
  if (rest.sprint_id) revalidatePath(`/app/sprints/${rest.sprint_id}`)
  return data
}

export async function getAssignableMembers(companyId: string | null) {
  if (!companyId) return []
  const supabase = await createClient()

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, group_id')
    .eq('id', companyId)
    .single()
  if (companyErr || !company) return []

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('user_id, role, company_id')
    .eq('group_id', company.group_id)
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  const unique = (memberships ?? []).filter((m) => {
    if (!m.user_id || seen.has(m.user_id)) return false
    seen.add(m.user_id)
    return true
  })

  const userIds = unique.map((m) => m.user_id).filter(Boolean)
  let profilesByUserId = new Map<string, { display_name: string | null; email: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, email')
      .in('user_id', userIds)
    profilesByUserId = new Map(
      (profiles ?? []).map((p) => [p.user_id as string, { display_name: (p.display_name as string | null) ?? null, email: (p.email as string | null) ?? null }])
    )
  }

  function roleLabel(role: string) {
    if (role === 'group_admin') return 'Admin groupe'
    if (role === 'company_admin') return 'Admin entreprise'
    if (role === 'finance_manager') return 'Finance'
    return 'Membre'
  }

  return unique.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    label: `${profilesByUserId.get(m.user_id)?.display_name ?? profilesByUserId.get(m.user_id)?.email ?? `${m.user_id.slice(0, 8)}…`} (${roleLabel(m.role)})`,
  }))
}

export async function updateTaskNextStepComment(taskId: string, next_step_comment: string | null) {
  const parsed = updateNextStepCommentSchema.parse({ id: taskId, next_step_comment })
  const supabase = await createClient()
  const trimmed = parsed.next_step_comment?.trim() || null
  const { data, error } = await supabase
    .from('tasks')
    .update({ next_step_comment: trimmed })
    .eq('id', parsed.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/app/tasks')
  revalidatePath('/app/planning')
  revalidatePath('/app/sprints', 'layout')
  return data
}

export async function updateTaskStatus(taskId: string, status: 'todo' | 'in_progress' | 'done' | 'cancelled') {
  const parsed = updateTaskStatusSchema.parse({ id: taskId, status })
  const supabase = await createClient()
  const update: Record<string, unknown> = { status: parsed.status }
  if (parsed.status === 'done') update.completed_at = new Date().toISOString()
  if (parsed.status !== 'done') update.completed_at = null

  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', parsed.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/app/tasks')
  revalidatePath('/app/planning')
  revalidatePath('/app/sprints', 'layout')
  return data
}
