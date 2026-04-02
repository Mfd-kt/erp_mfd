import type { TaskStatus } from './types'

/** Libellés FR pour une meilleure lisibilité des colonnes / filtres */
export const TASK_STATUS_LABELS_FR: Record<TaskStatus, string> = {
  todo: 'Nouveau',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
}

export const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  todo: 'border-zinc-500/50 bg-zinc-600/40 text-zinc-100',
  in_progress: 'border-amber-500/50 bg-amber-500/15 text-amber-200',
  done: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
  cancelled: 'border-zinc-600 bg-zinc-800 text-zinc-400',
}
