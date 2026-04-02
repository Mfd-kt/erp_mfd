export type SprintScopeType = 'business' | 'personal' | 'global'
export type SprintStatus = 'planned' | 'active' | 'completed' | 'cancelled'
export type SprintPriority = 'low' | 'normal' | 'high' | 'critical'

export interface Sprint {
  id: string
  company_id: string | null
  scope_type: SprintScopeType
  title: string
  description: string | null
  goal: string | null
  status: SprintStatus
  priority: SprintPriority
  start_date: string
  end_date: string
  created_by: string | null
  created_at: string
}

export interface SprintWithProgress extends Sprint {
  total_tasks: number
  completed_tasks: number
  progress_percent: number
}
