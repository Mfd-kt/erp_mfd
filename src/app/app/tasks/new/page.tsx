import { redirect } from 'next/navigation'

/** La création de tâches est réservée à la page d’un sprint : Sprints → [sprint] → Ajouter une tâche. */
export default function NewTaskRedirectPage() {
  redirect('/app/sprints')
}
