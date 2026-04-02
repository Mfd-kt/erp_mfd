'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { generateDailyPlan } from './service'
import { getDailyPlan, upsertDailyPlan } from './queries'

export async function saveDailyPlan(
  planDate: string,
  plan: {
    primary_task_id?: string | null
    secondary_task_1_id?: string | null
    secondary_task_2_id?: string | null
    notes?: string | null
    status?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await upsertDailyPlan(user.id, planDate, plan)
  revalidatePath('/app/planning')
}

export async function regenerateDailyPlan(planDate: string, options?: { keepPrimary?: boolean }) {
  const supabase = await createClient()
  const scope = await getAccessScope()
  if (!scope?.user) throw new Error('Non authentifié')

  const planScope = {
    companyIds: scope.companies.map((c) => c.id),
  }

  let keepPrimaryTaskId: string | undefined
  if (options?.keepPrimary) {
    const current = await getDailyPlan(scope.userId, planDate)
    keepPrimaryTaskId = current?.primary_task_id ?? undefined
  }

  const result = await generateDailyPlan(supabase, scope.userId, planDate, planScope, keepPrimaryTaskId)
  await upsertDailyPlan(scope.userId, planDate, {
    primary_task_id: result.primaryTask?.id ?? null,
    secondary_task_1_id: result.secondaryTasks[0]?.id ?? null,
    secondary_task_2_id: result.secondaryTasks[1]?.id ?? null,
    status: 'draft',
    plan_metadata: result.taskReasons,
  })
  revalidatePath('/app/planning')
  return result
}
