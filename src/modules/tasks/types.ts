export type TaskScopeType = 'business' | 'personal' | 'global'
export type TaskType = 'important' | 'secondary' | 'admin' | 'follow_up'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'
export type EnergyLevel = 'low' | 'medium' | 'high'

export type LinkedEntityType = 'debt' | 'revenue' | 'alert' | 'forecast' | null

export interface Task {
  id: string
  company_id: string | null
  assigned_to_user_id?: string | null
  sprint_id: string | null
  scope_type: TaskScopeType
  title: string
  description: string | null
  task_type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  /** Heure (time) liée à due_date, ex. "14:30:00" */
  due_time?: string | null
  /** Date de fin de tâche */
  end_date?: string | null
  /** Heure (time) liée à end_date, ex. "18:00:00" */
  end_time?: string | null
  /** Prochaine étape ou commentaire (ex. quand en cours ou terminé) */
  next_step_comment?: string | null
  estimated_minutes: number | null
  energy_level: EnergyLevel
  linked_entity_type: string | null
  linked_entity_id: string | null
  created_at: string
  completed_at: string | null
}
