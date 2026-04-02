import type { Task } from '@/modules/tasks/types'

export interface TaskWithReason {
  task: Task
  reason: string
}

export interface DailyPlanResult {
  primaryTask: Task | null
  secondaryTasks: [Task | null, Task | null]
  taskReasons: {
    primary?: string
    secondary1?: string
    secondary2?: string
  }
  rationale?: {
    primaryReason?: string
    secondaryReasons?: string[]
  }
}

export interface PlanScope {
  scopeType?: 'business' | 'personal' | 'global'
  companyIds?: string[]
}
