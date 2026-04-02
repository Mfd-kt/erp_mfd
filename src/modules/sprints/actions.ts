'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sprintSchema, updateSprintSchema } from './schema'
import type { SprintFormData, UpdateSprintFormData } from './schema'

export async function createSprint(formData: SprintFormData) {
  const parsed = sprintSchema.parse(formData)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('sprints')
    .insert({
      company_id: parsed.company_id ?? null,
      scope_type: parsed.scope_type,
      title: parsed.title,
      description: parsed.description ?? null,
      goal: parsed.goal ?? null,
      status: parsed.status,
      priority: parsed.priority,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/app/sprints')
  return data
}

export async function updateSprint(formData: UpdateSprintFormData) {
  const parsed = updateSprintSchema.parse(formData)
  const supabase = await createClient()
  const { id, ...rest } = parsed
  const { data, error } = await supabase
    .from('sprints')
    .update(rest)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/app/sprints')
  revalidatePath(`/app/sprints/${id}`)
  return data
}

export async function deleteSprint(sprintId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('sprints').delete().eq('id', sprintId)
  if (error) throw new Error(error.message)
  revalidatePath('/app/sprints')
}
