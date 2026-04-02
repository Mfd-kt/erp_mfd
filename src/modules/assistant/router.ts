/**
 * Server-side intent routing for the AI assistant.
 * Detects question intents and forces appropriate tool calls before the LLM.
 */

export type AssistantIntent =
  | 'scope_context'
  | 'global_summary'
  | 'admin_obligations'
  | 'entity_search'
  | 'daily_plan'
  | 'sprint_summary'
  | 'generic'

export interface ResolvedToolCall {
  toolName: string
  args: Record<string, unknown>
  intent: AssistantIntent
}

/** Normalize string: lowercase, strip accents, trim */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

/** Check if normalized message contains any of the patterns */
function matches(msg: string, patterns: string[]): boolean {
  const n = normalize(msg)
  return patterns.some((p) => n.includes(normalize(p)))
}

/** French-first patterns for each intent family */
const SCOPE_PATTERNS = [
  "comment s'appelle ma societe",
  "comment s'appelle ma société",
  'quelles societes j ai',
  'quelles sociétés j\'ai',
  'quelles societes jai',
  'dans quel perimetre suis-je',
  'dans quel périmètre suis-je',
  'ai-je une entite personnelle',
  'ai-je une entité personnelle',
  'quel est mon groupe',
  'quelles entites sont accessibles',
  'quelles entités sont accessibles',
  'quels comptes j ai',
  'quels comptes jai',
  'quelle societe est selectionnee',
  'quelle société est sélectionnée',
  'mes societes',
  'mes sociétés',
  'liste des societes',
  'liste des sociétés',
  'mes entites',
  'mes entités',
  'que sais-tu sur moi',
  'que sais tu sur moi',
  'structure de mon erp',
  'mon perimetre',
  'mon périmètre',
]

const GLOBAL_SUMMARY_PATTERNS = [
  'resume ma situation',
  'résume ma situation',
  'quel est mon etat global',
  'quel est mon état global',
  'que dois-je savoir aujourd hui',
  'que dois-je savoir aujourd\'hui',
  'fais-moi un point',
  'fais moi un point',
  'ou est le risque',
  'où est le risque',
  'ou j en suis',
  "où j'en suis",
  'point de situation',
  'etat des lieux',
  'état des lieux',
  'synthese',
  'synthèse',
  'bilan',
  'resume',
  'résumé',
]

const ADMIN_OBLIGATIONS_PATTERNS = [
  'obligations administratives',
  'risques fiscaux',
  'charges admin',
  'charges administratives',
  'quelles charges approchent',
  'echeances fiscales',
  'échéances fiscales',
  'urssaf',
  'cotisations',
  'impots',
  'impôts',
]

const ENTITY_SEARCH_PATTERNS = [
  'cherche ',
  'trouve ',
  'ou est ',
  'où est ',
  'recherche ',
  'lookup ',
  'search ',
]

const DAILY_PLAN_PATTERNS = [
  'que dois-je faire aujourd hui',
  'que dois-je faire aujourd\'hui',
  'quelles taches j ai',
  'quelles tâches j\'ai',
  'montre mon plan du jour',
  'plan du jour',
  'mes taches du jour',
  'mes tâches du jour',
  'quoi faire aujourd hui',
  'quoi faire aujourd\'hui',
]

const SPRINT_PATTERNS = [
  'resume mon sprint',
  'résume mon sprint',
  'ou en est mon sprint',
  "où en est mon sprint",
  'avancement du sprint',
  'sprint summary',
]

/**
 * Detect assistant intent from user message.
 * Uses normalized French-first string matching.
 */
export function detectAssistantIntent(userMessage: string): AssistantIntent {
  const msg = userMessage.trim()
  if (!msg) return 'generic'

  if (matches(msg, SCOPE_PATTERNS)) return 'scope_context'
  if (matches(msg, GLOBAL_SUMMARY_PATTERNS)) return 'global_summary'
  if (matches(msg, ADMIN_OBLIGATIONS_PATTERNS)) return 'admin_obligations'
  if (matches(msg, ENTITY_SEARCH_PATTERNS)) return 'entity_search'
  if (matches(msg, DAILY_PLAN_PATTERNS)) return 'daily_plan'
  if (matches(msg, SPRINT_PATTERNS)) return 'sprint_summary'

  return 'generic'
}

/**
 * Resolve which tool(s) to run first for a given intent.
 * Returns tool name and args. For entity_search, extracts query from message.
 */
export function resolveInitialToolCalls(
  intent: AssistantIntent,
  userMessage: string
): ResolvedToolCall[] {
  switch (intent) {
    case 'scope_context':
      return [{ toolName: 'get_current_scope_context', args: {}, intent: 'scope_context' }]
    case 'global_summary':
      return [{ toolName: 'get_full_global_context', args: {}, intent: 'global_summary' }]
    case 'admin_obligations':
      return [{ toolName: 'get_admin_obligations', args: {}, intent: 'admin_obligations' }]
    case 'entity_search': {
      const query = extractSearchQuery(userMessage)
      if (query) {
        return [{ toolName: 'search_erp_entities', args: { query }, intent: 'entity_search' }]
      }
      return []
    }
    case 'daily_plan':
      return [
        { toolName: 'get_daily_plan', args: {}, intent: 'daily_plan' },
        { toolName: 'get_open_tasks', args: {}, intent: 'daily_plan' },
      ]
    case 'sprint_summary': {
      const sprintId = extractSprintId(userMessage)
      if (sprintId) {
        return [{ toolName: 'get_sprint_summary', args: { sprintId }, intent: 'sprint_summary' }]
      }
      return []
    }
    default:
      return []
  }
}

/** Extract search query from message (text after "cherche", "trouve", "où est", etc.) */
function extractSearchQuery(msg: string): string {
  const m = msg.match(
    /^\s*(?:cherche|trouve|ou est|où est|recherche|lookup|search)\s+(.+)$/i
  )
  if (m?.[1]) return m[1].trim().slice(0, 100)
  return msg.trim().slice(0, 100)
}

/** Extract sprint ID from message if present (UUID pattern) */
function extractSprintId(msg: string): string {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const m = msg.match(uuidRegex)
  return m ? m[0] : ''
}

/**
 * Build preloaded context block for injection into model input.
 * Formats tool results as structured text the model can use.
 */
export function maybeBuildPreloadedContext(
  intent: AssistantIntent,
  toolResults: { toolName: string; result: string }[]
): string {
  if (toolResults.length === 0) return ''

  const lines: string[] = [
    '--- CONTEXTE PRÉCHARGÉ (source de vérité, utilise ces données pour répondre) ---',
  ]
  for (const { toolName, result } of toolResults) {
    try {
      const parsed = JSON.parse(result) as Record<string, unknown>
      if (parsed.error) {
        lines.push(`${toolName}: erreur - ${parsed.error}`)
      } else {
        lines.push(`${toolName}:`)
        lines.push(JSON.stringify(parsed, null, 2))
      }
    } catch {
      lines.push(`${toolName}: ${result.slice(0, 500)}`)
    }
  }
  lines.push('--- FIN DU CONTEXTE PRÉCHARGÉ ---')
  return lines.join('\n')
}

/**
 * Detect if the financial context is sparse/empty (system not yet configured).
 * Used to avoid presenting empty data as "healthy" financial situation.
 */
export interface SparseContextCheck {
  isSparse: boolean
  reasons: string[]
  suggestedSteps: string[]
}

export function detectSparseFinancialContext(data: {
  totalCash?: number
  totalOpenDebt?: number
  totalRevenueExpected?: number
  overdueCount?: number
  companiesCount?: number
  tasksCount?: number
  alertsCritical?: number
  alertsWarnings?: number
  hasPlan?: boolean
}): SparseContextCheck {
  const reasons: string[] = []
  const suggestedSteps: string[] = []

  const cash = Number(data.totalCash ?? 0)
  const debt = Number(data.totalOpenDebt ?? 0)
  const revenue = Number(data.totalRevenueExpected ?? 0)
  const tasks = Number(data.tasksCount ?? 0)
  const companies = Number(data.companiesCount ?? 0)

  if (companies === 0) {
    reasons.push('Aucune entité/société configurée')
    suggestedSteps.push('Créer ou rejoindre au moins une société/entité')
  }
  if (cash === 0 && debt === 0 && revenue === 0) {
    reasons.push('Aucune donnée financière (trésorerie, dettes, revenus)')
    suggestedSteps.push('Ajouter au moins 1 compte')
    suggestedSteps.push('Ajouter au moins 1 revenu attendu')
    suggestedSteps.push('Ajouter au moins 1 dette ou dépense récurrente')
  }
  if (tasks === 0 && !data.hasPlan) {
    reasons.push('Aucune tâche ni plan du jour')
    suggestedSteps.push('Créer des tâches ou un plan du jour pour suivre l\'exécution')
  }

  const isSparse = reasons.length >= 2 || (companies > 0 && cash === 0 && debt === 0 && revenue === 0)

  return {
    isSparse,
    reasons: [...new Set(reasons)],
    suggestedSteps: [...new Set(suggestedSteps)],
  }
}
