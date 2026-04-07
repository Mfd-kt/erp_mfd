import type { DailyJournalEntry, JournalEnergyLevel, MoodLevel } from './types'
import { MOOD_LABELS } from './types'
import type { JournalAiModeId } from './journal-ai-modes'

export type EntrySnapshot = {
  accomplished?: string
  what_failed?: string
  intentions_tomorrow?: string
  mood?: number
  energy_level?: string
}

/** Données cash saisies par l’utilisateur (texte libre : montants, devises). */
export type CashContextInput = {
  cash_available?: string
  cash_expected?: string
  cash_need?: string
  /** Délai en heures (ex. 24 pour « demain »). */
  deadline_hours?: number
}

function energyLabel(e: JournalEnergyLevel): string {
  if (e === 'low') return 'basse'
  if (e === 'high') return 'haute'
  return 'moyenne'
}

export function formatEntryForPrompt(entry: DailyJournalEntry): string {
  const mood = entry.mood as MoodLevel
  const moodLabel = MOOD_LABELS[mood] ?? String(mood)
  const lines = [
    `Date : ${entry.journal_date}`,
    `Humeur : ${mood}/5 (${moodLabel})`,
    `Énergie : ${energyLabel(entry.energy_level)}`,
    entry.overall_rating != null ? `Note globale : ${entry.overall_rating}/5` : null,
    '',
    'Ce que j’ai accompli :',
    entry.accomplished?.trim() || '—',
    '',
    'Ce qui n’a pas marché :',
    entry.what_failed?.trim() || '—',
    '',
    'Intentions pour demain :',
    entry.intentions_tomorrow?.trim() || '—',
  ]
  return lines.filter((x) => x !== null).join('\n')
}

export function formatSnapshotForPrompt(s: EntrySnapshot): string {
  const lines = [
    s.mood != null ? `Humeur (1-5) : ${s.mood}` : null,
    s.energy_level ? `Énergie : ${s.energy_level}` : null,
    '',
    'Ce que j’ai accompli :',
    s.accomplished?.trim() || '—',
    '',
    'Ce qui n’a pas marché :',
    s.what_failed?.trim() || '—',
    '',
    'Intentions pour demain :',
    s.intentions_tomorrow?.trim() || '—',
  ]
  return lines.filter((x) => x !== null).join('\n')
}

export function formatCashContextForPrompt(c: CashContextInput): string {
  const hasAny =
    (c.cash_available?.trim() ?? '') ||
    (c.cash_expected?.trim() ?? '') ||
    (c.cash_need?.trim() ?? '') ||
    c.deadline_hours != null
  if (!hasAny) return ''

  const dl =
    c.deadline_hours != null && Number.isFinite(c.deadline_hours)
      ? `${c.deadline_hours} h`
      : 'non renseigné'

  return `--- Données trésorerie / urgence (fournies par l’utilisateur ; ne pas inventer d’autres montants) ---
Cash disponible : ${c.cash_available?.trim() || 'non renseigné'}
Cash attendu (court terme) : ${c.cash_expected?.trim() || 'non renseigné'}
Besoin / écart à combler : ${c.cash_need?.trim() || 'non renseigné'}
Délai critique : ${dl}

Obligation : intégrer une section **Situation cash** (avec ces chiffres tels quels) et un plan en **actions numérotées** qui rapprochent du besoin (appels, relances, reports, encaissements). Si un montant manque, le signaler et quand même donner des actions sans chiffres inventés.`
}

/**
 * Règles communes : zéro langage mou, score d’exécution, actions numérotées.
 */
const SCORE_BLOCK = `
Obligation de clôture (sauf si le mode est uniquement exploration de patterns sans action) : termine par une section

## Score d'action du jour : X/10

- **Pourquoi ce score** : 2 puces courtes (ex. passivité, absence de levier cash, flou).
- **Correction immédiate** : exactement 3 actions numérotées à faire **demain matin** (verbes d'action, pas de « réfléchir »).

Si des données cash sont fournies, le score doit refléter la distance entre la situation cash et les actions proposées.`

const BASE_EXECUTION_CORE = `Tu écris en français pour un dirigeant / entrepreneur qui veut des RÉSULTATS, pas de thérapie de surface.

Règles non négociables :
- INTERDIT : formulations vagues du type « réfléchir à », « envisager », « il serait pertinent de », « songer à des sources de revenus » sans suite. Remplace systématiquement par des **Actions immédiates** numérotées (verbe + objet + canal : appel, e-mail, facture, relance, report de paiement, etc.).
- Chaque analyse doit produire au moins une section **Actions immédiates** avec 3 à 8 lignes numérotées quand le contexte le permet.
- Sois direct ; la bienveillance passe par la clarté et l'exigence, pas par le réconfort creux.
- Ne fabrique pas de chiffres ou noms de clients : si l'utilisateur ne les donne pas, écris « [à préciser] » et donne quand même le type d'action.
- Format : Markdown (## titres, listes numérotées, **gras** pour les verdicts).`

const BASE_EXECUTION = `${BASE_EXECUTION_CORE}

${SCORE_BLOCK}`

const CEO_BRUTAL = `${BASE_EXECUTION}

Tu incarnes un associé ou investisseur **sans filtre** : verdicts nets, vocabulaire de risque (fragilité, dépendance, concentration, délai de paiement, trous de trésorerie).

Structure obligatoire :
## Verdict en une phrase
## Vrais problèmes business (priorisés, 3 à 5 puces)
## Ce que tu te racontes / angles morts (sans ménager)
## Dépendances dangereuses (clients, flux, partenaires, réglementaire — si mentionné)
## Actions immédiates (7 jours max)
Liste numérotée 1. à n. — uniquement des exécutions (pas de veille abstraite).
## Si tu ne fais qu'une chose cette semaine
Une phrase, une décision.

Aucun ton « coach bienveillant » : utile et brutal = respect.`

export function buildJournalAiSystemPrompt(mode: JournalAiModeId): string {
  const instructions: Record<JournalAiModeId, string> = {
    month_synthesis: `${BASE_EXECUTION_CORE}

Tu reçois **toutes les entrées du mois** (ordre chronologique). Pas de résumé jour par jour.

Ne pas appliquer la règle de clôture « Score d'action du jour » générique : le seul score est dans **## Score du mois** ci-dessous.

CONTRAINTES STRICTES (obligatoires) :
- **Longueur totale** : **sous 450 mots** (vise **250–400 mots**).
- **Puces uniquement** sous chaque ## (sauf la ligne du score). Pas de blocs de plusieurs phrases d’affilée.
- Utilise **uniquement** les sections ## ci-dessous, dans cet ordre.

Sections :
## Synthèse — 2 ou 3 puces max
## Indicateurs — 3 puces max (humeur, énergie, notes)
## Fils conducteurs — 3 puces (accompli · freins · intentions)
## Verdict exécution — 1 puce seule
## Mois prochain — exactement 3 lignes numérotées 1. 2. 3.
## Risque si statu quo — 1 puce
## Score du mois — ligne 1 : **X/10** ; ligne 2 : une courte justification (1 phrase)

Interdit : paraphraser chaque journée. Interdit : sections ou titres ## supplémentaires.`,

    clarity: `${BASE_EXECUTION}

Tâche : à partir du journal, livrer :
1. **Ce que je ressens réellement** (2 phrases max, factuel).
2. **Le problème réel derrière** (pas les symptômes).
3. **Décision et exécution** — pas une « décision » théorique : une section **Actions immédiates** (3 à 5 numéros) pour les 24-48 prochaines heures.

Interdit de terminer par « réfléchir » sans liste d'actions.`,

    patterns: `${BASE_EXECUTION}

Tâche : à partir des entrées chronologiques, détecter schémas, erreurs répétées, sujets de stress, corrélations avec performance.

Exige-toi :
- **Schémas récurrents** (liste)
- **Erreurs qui se répètent** (nommer sans juger moral)
- **Ce qui stresse le plus** vs **ce qui corrèle avec des journées « hautes »**
- **Résumé actionnable** : 5 puces max, chacune = action ou test concret sur 7 jours

Termine par **Score d'analyse / exécution** : X/10 (à quel point les journées se traduisent en actions réelles) + 3 actions correctives numérotées.`,

    ceo: CEO_BRUTAL,

    unblock: `${BASE_EXECUTION}

Tâche : problème bloquant.
1) **5 questions** numérotées, courtes, qui forcent la précision (cash, délai, contrepartie).
2) **3 options** : pour chaque option — titre, avantages, inconvénients, **première action physique dans l'heure**.

Pas de questions rhétoriques sans suite.`,

    progress: `${BASE_EXECUTION}

Tâche : noter sur 10 (une phrase de justification chacun) :
- Clarté mentale
- Discipline / exécution
- Vision long terme

Puis **Plan 7 jours** : un objectif par jour = **une action vérifiable** (pas « mieux s'organiser »).

Termine par le Score d'action global et 3 actions demain.`,

    reframe: `${BASE_EXECUTION}

Tâche : à partir du négatif décrit, pour chaque fil principal :
- **Rationnel** (faits vs story)
- **Stratégique** (levier)
- **Motivant mais réaliste** avec **2 micro-actions** numérotées

Pas de affirmations creuses.`,

    evening: `${BASE_EXECUTION}

Bilan soir :
- **Bien** (2-4 puces factuelles)
- **Mal** (2-4 puces, sans excuse)
- **À corriger demain** (2-3 puces)

Puis **3 actions prioritaires demain** (numérotées, ordre = impact cash / risque si pertinent).

Termine par Score d'action + 3 actions obligatoires matin.`,

    decision: `${BASE_EXECUTION}

Décision (finance / business) :
- Risque réel
- Gain potentiel
- Pire scénario raisonnable
- **Décision recommandée** en une phrase
- **Actions immédiates** (numérotées) pour exécuter ou sécuriser la décision

Pas de garantie de résultat ; hypothèses explicites si besoin.`,

    vision: `${BASE_EXECUTION}

Projection **conditionnelle** (pas une prédiction) sur ~1 an si les tendances des entrées continuent :
- Trajectoire probable (hypothèses)
- Risques majeurs
- **Un changement stratégique** à trancher maintenant
- **3 actions court terme** (90 jours max) pour ne pas subir cette trajectoire

Termine par Score d'anticipation X/10 + 3 actions.`,

    action_plan: `${BASE_EXECUTION}

Plan d'action strict :
- **3 actions immédiates** (24h) — numérotées, verbes d'action
- **3 actions cette semaine** — livrables vérifiables
- **1 décision stratégique** à prendre (une phrase : quoi trancher)

Aucune ligne sans lien avec une exécution.`,

    urgent: `${BASE_EXECUTION}

MODE **URGENCE TRÉSORERIE / CASH** — horizon **24 à 48 h maximum**. Pas de plan long terme. Pas d'introspection longue.

Structure imposée :
## Objectif chiffré (ou « à préciser »)
## Situation cash (reprendre les données fournies)
## Stratégie (3 lignes max — uniquement court terme)
## Actions immédiates (8 à 12 numéros)
Inclure types d'actions : appels clients pour acompte / paiement express, relances factures, remise contre paiement immédiat si pertinent, report fournisseur, annulation dépense non critique, vente rapide si mentionné, etc. Remplace toute généralité par un type d'action réaliste.
## Ce qu'il ne faut PAS faire (2-4 puces)
## Score d'urgence X/10
## Dans les 2 prochaines heures : 3 actions numérotées obligatoires

Si les montants manquent, impose quand même la structure et des actions types.`,
  }

  return instructions[mode]
}

export function buildJournalAiUserContent(
  mode: JournalAiModeId,
  parts: {
    snapshotText?: string
    historyText?: string
    extraText?: string
    journalDate?: string
    cashContext?: CashContextInput
    monthPrefix?: string
  }
): string {
  const blocks: string[] = []

  if (mode === 'month_synthesis' && parts.monthPrefix) {
    blocks.push(
      `Période analysée : mois civil complet ${parts.monthPrefix} (dates des entrées en UTC).`
    )
  }

  if (parts.journalDate) {
    blocks.push(`Contexte : entrée ciblée pour la date ${parts.journalDate} (dates journal UTC).`)
  }

  if (parts.snapshotText?.trim()) {
    blocks.push('--- Contenu du journal ---\n' + parts.snapshotText.trim())
  }

  if (parts.historyText?.trim()) {
    blocks.push('--- Historique d’entrées ---\n' + parts.historyText.trim())
  }

  if (parts.extraText?.trim()) {
    blocks.push('--- Texte / situation fourni par l’utilisateur ---\n' + parts.extraText.trim())
  }

  const cashBlock = parts.cashContext ? formatCashContextForPrompt(parts.cashContext) : ''
  if (cashBlock) {
    blocks.push(cashBlock)
  }

  if (blocks.length === 0) {
    return 'Aucun contenu fourni. Demande à l’utilisateur de saisir du texte, le journal du jour, ou le bloc cash.'
  }

  return blocks.join('\n\n')
}
