import type { SprintWithProgress } from './types'

export type SprintHealthStatus = 'on_track' | 'at_risk' | 'delayed'

export interface SprintHealth {
  status: SprintHealthStatus
  timeProgressPercent: number
  taskCompletionPercent: number
  remainingCriticalTasks: number
  label: string
}

/**
 * Compute sprint health: on_track, at_risk, or delayed.
 * Logic: completion >= time_progress → on_track
 *        slightly behind → at_risk
 *        far behind → delayed
 */
export function computeSprintHealth(sprint: SprintWithProgress): SprintHealth {
  const start = new Date(sprint.start_date).getTime()
  const end = new Date(sprint.end_date).getTime()
  const now = Date.now()
  const totalDays = (end - start) / (1000 * 60 * 60 * 24)
  const elapsedDays = Math.max(0, (now - start) / (1000 * 60 * 60 * 24))
  const timeProgressPercent = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0
  const taskCompletionPercent = sprint.progress_percent ?? 0

  let status: SprintHealthStatus = 'on_track'
  let label = 'Dans les temps'

  if (taskCompletionPercent >= timeProgressPercent) {
    status = 'on_track'
    label = 'Dans les temps'
  } else if (timeProgressPercent - taskCompletionPercent <= 20) {
    status = 'at_risk'
    label = 'À risque'
  } else {
    status = 'delayed'
    label = 'En retard'
  }

  return {
    status,
    timeProgressPercent,
    taskCompletionPercent,
    remainingCriticalTasks: 0,
    label,
  }
}
