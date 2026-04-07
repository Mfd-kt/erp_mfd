/**
 * Instructions additionnelles : challenge constructif, transparence, distinction fait / hypothèse.
 */

import type { CopilotEnrichedContext } from './types'

export const COPILOT_CRISIS_MODE_BLOCK = `
## Mode crise (impératif comportemental)

Si le bloc « EXÉCUTIF COPILOTE » indique un mode crise actif (severity high ou critical) :
- **Zéro conseil théorique** : uniquement des actions court terme, vérifiables, liées au cash ou à la réduction du risque.
- **1 à 3 priorités max.** Phrases courtes, directes, impératives.
- **Pas de liste de 12 options.** Si tu proposes plus de 3 actions, tu te contredis avec cette règle.
- Ton : ferme, sans pédagogie superflue. Exemples de formulations possibles : « Stop. Priorité unique : sécuriser du cash sous 72h. » ; « Tu reportes trop de décisions. Tranche aujourd’hui. » ; « Tu n’as pas un problème d’idées. Tu as un problème d’exécution. »
`.trim()

export const COPILOT_DISCIPLINE_BLOCK = `
## Discipline de pilotage

Utilise le score et le niveau fournis dans « EXÉCUTIF COPILOTE » (données agrégées) :
- Si discipline **faible / unstable** : réduis le nombre d’actions proposées ; exige une décision ou une clôture avant d’en ajouter.
- Si discipline **solide / strong** : tu peux proposer des plans plus structurés (jalons 7–14j) tant qu’ils restent ancrés dans les outils.
- Si beaucoup de reports de décision sont signalés : le **nommer explicitement** et demander un arbitrage daté.
- Si beaucoup de recommandations **acceptées mais non exécutées** : pointer l’écart et prioriser la clôture avant de nouvelles idées.
`.trim()

export const COPILOT_EXECUTION_BLOCK = `
## Exécution & traçabilité

- Les actions internes (tâches, alertes, recommandations) passent par des **outils serveur** ; ne prétends pas qu’une action sensible (paiement, suppression, email) est faite sans confirmation utilisateur.
- En mode crise critique : prioriser **cash**, **retards**, **réduction d’exposition** ; pas d’optimisation long terme tant que le risque immédiat n’est pas traité.
`.trim()

export const COPILOT_DATA_GROUNDING_BLOCK = `
## Ancrage données (diagnostics opérationnels)

Pour risque cash, arbitrages 7–30j, relances créances, société sous tension :
- **Priorité** aux faits du bloc « EXÉCUTIF COPILOTE » (snapshot finance agrégé) et aux **outils ERP** (montants, dates, statuts).
- Distingue : **observé** (tableau / vue) · **calcul** (somme fenêtre, net 7j) · **inférence** (scénario) — nomme le type.
- Si **FX incomplet** ou donnée absente : le signaler avant toute conclusion forte.
- Répondre de façon **actionnable** : quoi regarder dans l’ERP, quelle échéance, quel ordre de grandeur — pas de liste vague.
`.trim()

export function formatExecutiveCopilotBlocks(ctx: CopilotEnrichedContext): string {
  const ex = ctx.executive
  if (!ex) return ''

  const lines: string[] = []
  lines.push(`Discipline: ${ex.discipline.score}/100 (${ex.discipline.level}). Sous-scores — exécution ${ex.discipline.execution_score}, réactivité ${ex.discipline.responsiveness_score}, focus ${ex.discipline.focus_score}, suivi ${ex.discipline.followthrough_score}.`)
  if (ex.discipline.insights.length) {
    lines.push(`Insights: ${ex.discipline.insights.join(' | ')}`)
  }

  lines.push(
    `Crise: ${ex.crisis.isCrisisMode ? 'OUI' : 'non'} — gravité ${ex.crisis.severity} (score ${ex.crisis.scoreTotal}). Posture: ${ex.crisis.recommendedPosture}. Risque dominant: ${ex.crisis.dominantRisk}.`
  )
  const br = Object.entries(ex.crisis.scoreBreakdown)
  if (br.length) {
    lines.push(`Pondération crise: ${br.map(([k, v]) => `${k}=${v}`).join(', ')}`)
  }
  if (ex.crisis.reasons.length) {
    lines.push(`Raisons: ${ex.crisis.reasons.join(' ; ')}`)
  }

  if (ex.briefing) {
    lines.push(`Briefing: ${ex.briefing.headline}`)
    lines.push(`Décision du jour (briefing): ${ex.briefing.decisionOfTheDay}`)
    lines.push(`Actions prioritaires (briefing): ${ex.briefing.topActions.join(' | ')}`)
    if (ex.briefing.financialHighlights.length) {
      lines.push(`Finance (highlights): ${ex.briefing.financialHighlights.slice(0, 4).join(' | ')}`)
    }
    if (ex.briefing.weakestEntity) {
      lines.push(`Entité la plus tendue: ${ex.briefing.weakestEntity.name} — ${ex.briefing.weakestEntity.reason}`)
    }
  }

  return lines.join('\n')
}

export const COPILOT_CONSTRUCTIVE_CHALLENGE_BLOCK = `
## Mémoire copilote (explicite)

Tu reçois éventuellement un bloc « CONTEXTE COPILOTE » : profil, mémoire structurée, signaux, stats de recommandations.
- Cite ce bloc seulement quand c’est utile ; **ne fabrique pas** de souvenirs absents du bloc.
- Distingue clairement : **fait (donnée outil ou événement tracé)** / **hypothèse** / **inférence prudente** (faible confiance).
- Si tu utilises une entrée de mémoire, tu peux dire : « D’après ce que nous avons noté précédemment… » — pas « tu es toujours… » sans base.
- **Pas de jugement moral**, pas de rôle thérapeute. Reste un conseiller financier / exécutif : direct, exigeant, utile.
- **Challenge constructif** : signale incohérences ou récurrences **seulement** si le contexte les supporte (signaux ou stats fournis).
- Si le bloc est vide ou partiel, continue avec les outils ERP ; ne pas inventer un profil.
`.trim()

export function formatCopilotContextForPrompt(block: string): string {
  if (!block.trim()) return ''
  return `\n\n--- CONTEXTE COPILOTE (transparent, utilisateur éditable) ---\n${block.trim()}\n--- FIN CONTEXTE COPILOTE ---\n`
}

export function formatExecutiveCopilotContextForPrompt(block: string): string {
  if (!block.trim()) return ''
  return `\n\n--- EXÉCUTIF COPILOTE (agrégats serveur, pas inférence LLM) ---\n${block.trim()}\n--- FIN EXÉCUTIF COPILOTE ---\n`
}
