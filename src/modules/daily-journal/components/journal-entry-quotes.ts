/** Citations courtes, stables par date (même jour = même citation). */
export const JOURNAL_ENTRY_QUOTES: string[] = [
  'Ce que tu notes aujourd’hui devient la boussole de demain.',
  'Un bilan honnête vaut mieux qu’une journée parfaite sur le papier.',
  'Les petits progrès comptent autant que les grands coups.',
  'Prends le temps de nommer ce qui compte — c’est déjà avancer.',
  'La clarté naît souvent après quelques lignes sincères.',
  'Tu n’as pas besoin d’avoir tout réussi pour mériter ce bilan.',
]

export function quoteForJournalDate(journalDate: string): string {
  let n = 0
  for (let i = 0; i < journalDate.length; i++) n = (n + journalDate.charCodeAt(i) * (i + 1)) % 997
  return JOURNAL_ENTRY_QUOTES[n % JOURNAL_ENTRY_QUOTES.length]
}
