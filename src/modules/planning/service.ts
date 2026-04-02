import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task } from '@/modules/tasks/types'
import type { DailyPlanResult, PlanScope } from './types'
import { computeCompanyAlerts } from '@/modules/alerts/service'
import { filterRelevantTasks } from './task-validation'
import { autoCloseObsoleteTasks } from '@/modules/tasks/auto-close'
import { formatTaskReason } from './reason-formatter'

interface ScoredTask {
  task: Task
  score: number
  reason: string
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 40,
  high: 25,
  normal: 10,
  low: 5,
}

const TASK_TYPE_WEIGHTS: Record<string, number> = {
  important: 30,
  secondary: 15,
  admin: 5,
  follow_up: 10,
}

/**
 * Generate a smart daily plan: 1 important task + 2 secondary tasks.
 * Scoring: overdue > critical alerts > active sprint > due soon > high priority.
 */
export async function generateDailyPlan(
  supabase: SupabaseClient,
  userId: string,
  planDate: string,
  scope?: PlanScope,
  keepPrimaryTaskId?: string
): Promise<DailyPlanResult> {
  const today = new Date(planDate)
  const todayStr = planDate
  const in3Days = new Date(today)
  in3Days.setDate(today.getDate() + 3)
  const in3Str = in3Days.toISOString().slice(0, 10)

  await autoCloseObsoleteTasks(supabase)

  // Fetch eligible tasks (todo or in_progress, not cancelled)
  let query = supabase
    .from('tasks')
    .select('*')
    .in('status', ['todo', 'in_progress'])
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (scope?.scopeType) query = query.eq('scope_type', scope.scopeType)

  const { data: tasksRaw, error } = await query
  if (error) throw new Error(error.message)
  let taskList = (tasksRaw ?? []) as Task[]
  if (scope?.companyIds?.length) {
    const ids = new Set(scope.companyIds)
    taskList = taskList.filter((t) => !t.company_id || ids.has(t.company_id))
  }

  taskList = await filterRelevantTasks(supabase, taskList)

  if (taskList.length === 0) {
    return { primaryTask: null, secondaryTasks: [null, null] }
  }

  // Fetch alerts for all companies the user has access to
  const companyIds = [...new Set(taskList.map((t) => t.company_id).filter(Boolean))] as string[]
  const alertsByEntity: Map<string, { severity: string }> = new Map()
  for (const cid of companyIds) {
    const result = await computeCompanyAlerts(supabase, cid)
    for (const a of result.alerts) {
      if (a.entityId && a.entityType) {
        alertsByEntity.set(`${a.entityType}:${a.entityId}`, { severity: a.severity })
      }
    }
  }

  // Fetch active sprints
  const { data: activeSprints } = await supabase
    .from('sprints')
    .select('id')
    .eq('status', 'active')
  const activeSprintIds = new Set((activeSprints ?? []).map((s) => s.id))

  // Score each task
  const scored: ScoredTask[] = taskList.map((task) => {
    let score = 0
    const reasons: string[] = []

    // Base: task type
    score += TASK_TYPE_WEIGHTS[task.task_type] ?? 10
    reasons.push(`type:${task.task_type}`)

    // Base: priority
    score += PRIORITY_WEIGHTS[task.priority] ?? 10
    reasons.push(`priority:${task.priority}`)

    // Overdue (due_date < today)
    if (task.due_date && task.due_date < todayStr) {
      score += 80
      reasons.push('overdue')
    }

    // Due soon (within 3 days)
    if (task.due_date && task.due_date >= todayStr && task.due_date <= in3Str) {
      score += 35
      reasons.push('due_soon')
    }

    // Linked to critical alert
    if (task.linked_entity_type && task.linked_entity_id) {
      const key = `${task.linked_entity_type}:${task.linked_entity_id}`
      const alert = alertsByEntity.get(key)
      if (alert?.severity === 'critical') {
        score += 60
        reasons.push('critical_alert')
      } else if (alert?.severity === 'warning') {
        score += 25
        reasons.push('warning_alert')
      }
    }

    // Active sprint
    if (task.sprint_id && activeSprintIds.has(task.sprint_id)) {
      score += 30
      reasons.push('active_sprint')
    }

    return { task, score, reason: reasons.join(',') }
  })

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score)

  let primary: ScoredTask | null = null
  let primaryTask: Task | null = null

  if (keepPrimaryTaskId) {
    const kept = scored.find((s) => s.task.id === keepPrimaryTaskId)
    if (kept) {
      primary = kept
      primaryTask = kept.task
    }
  }

  if (!primary) {
    const importantCandidates = scored.filter((s) => s.task.task_type === 'important')
    primary = importantCandidates.length > 0 ? importantCandidates[0] : scored[0]
    primaryTask = primary?.task ?? null
  }

  // Select 2 secondary (exclude primary, prefer secondary type)
  const remaining = scored.filter((s) => s.task.id !== primaryTask?.id)
  const secondaryCandidates = remaining.filter((s) => s.task.task_type === 'secondary')
  const secondary1 = secondaryCandidates[0] ?? remaining[0]
  let secondary2 = secondaryCandidates[1] ?? remaining[1]
  if (secondary2 && secondary2.task.id === secondary1?.task.id) {
    secondary2 = remaining.find((s) => s.task.id !== secondary1?.task.id) ?? null
  }

  const task2 = secondary2?.task && secondary2.task.id !== secondary1?.task.id ? secondary2.task : null
  return {
    primaryTask: primaryTask ?? null,
    secondaryTasks: [secondary1?.task ?? null, task2],
    taskReasons: {
      primary: formatTaskReason(primary?.reason, primaryTask ?? undefined),
      secondary1: formatTaskReason(secondary1?.reason, secondary1?.task),
      secondary2: formatTaskReason(secondary2?.reason, secondary2?.task),
    },
    rationale: {
      primaryReason: primary?.reason,
      secondaryReasons: [secondary1?.reason, secondary2?.reason].filter(Boolean) as string[],
    },
  }
}
