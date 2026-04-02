/**
 * Convert internal reason codes to human-readable task_reason for UI.
 */
export function formatTaskReason(
  reason: string | undefined,
  task?: { due_date?: string | null }
): string {
  if (!reason) return 'Priorité normale'
  const parts = reason.split(',')
  const today = new Date().toISOString().slice(0, 10)

  if (parts.includes('overdue') && task?.due_date) {
    const due = new Date(task.due_date)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    return `En retard (${diffDays} jour${diffDays > 1 ? 's' : ''})`
  }
  if (parts.includes('critical_alert')) return 'Lié à une alerte critique'
  if (parts.includes('warning_alert')) return 'Lié à un avertissement'
  if (parts.includes('due_soon') && task?.due_date) {
    const due = new Date(task.due_date)
    const todayDate = new Date(today)
    const diffDays = Math.floor((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Échéance aujourd\'hui'
    if (diffDays === 1) return 'Échéance demain'
    return `Échéance dans ${diffDays} jours`
  }
  if (parts.includes('active_sprint')) return 'Fait partie du sprint actif'
  if (parts.includes('priority:critical')) return 'Priorité critique'
  if (parts.includes('priority:high')) return 'Haute priorité'
  if (parts.includes('type:important')) return 'Tâche importante'

  return 'Priorité normale'
}
