/** Ligne de détail dans la popup « origine du calcul » (Vue groupe). */
export interface GroupExplainLine {
  label: string
  value: string
  /** Ex. nom de société, type de ligne */
  meta?: string
  /** Si défini, la ligne est cliquable (navigation vers la fiche / liste) */
  href?: string
}

export interface GroupExplainPayload {
  title: string
  intro: string
  /** Formule métier / logique de calcul */
  formula: string
  lines: GroupExplainLine[]
  footnote?: string
}

export interface GroupExecutionTasksDigest {
  counts: {
    open: number
    todo: number
    in_progress: number
    done: number
    total_non_cancelled: number
  }
  by_company: Record<string, { open: number; todo: number; in_progress: number; done: number }>
  upcoming: Array<{
    id: string
    company_id: string | null
    title: string
    status: 'todo' | 'in_progress' | 'done' | 'cancelled'
    due_date: string | null
    due_time?: string | null
    sprint_title?: string | null
  }>
}
