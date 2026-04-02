import type { ToolDefinition } from './providers/base'

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_current_scope_context',
    description: 'OBLIGATOIRE pour questions sur le périmètre, sociétés accessibles, groupe, entité personnelle, ou contexte actuel. Retourne scopeType, groupName, accessibleCompanies, hasPersonalEntity, currentModeDescription. Utiliser AVANT de répondre à "comment s\'appelle ma société", "quelles sociétés j\'ai", "dans quel périmètre suis-je", "ai-je une entité personnelle".',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_accessible_companies',
    description: 'Liste des sociétés/entités accessibles. Utiliser quand l\'utilisateur demande quelles sociétés il a. filterType optionnel: "business" ou "personal".',
    parameters: { type: 'object', properties: { filterType: { type: 'string', enum: ['business', 'personal'] } } },
  },
  {
    name: 'get_full_global_context',
    description: 'Synthèse exécutive complète: dashboard, prévision, alertes, tâches, plan du jour, sociétés, capacité de retrait. Utiliser pour "résume ma situation", "état global", "que dois-je savoir aujourd\'hui".',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'search_erp_entities',
    description: 'Recherche dans sociétés, créanciers, dettes, revenus, règles récurrentes, tâches. Retourne les meilleurs matchs avec type et id.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'get_admin_obligations',
    description: 'Obligations administratives: dettes en retard et à échéance sous 14 jours, avec catégories. Détection best-effort fiscal/admin.',
    parameters: { type: 'object', properties: {} },
  },
  { name: 'get_global_dashboard', description: 'Tableau de bord groupe: trésorerie, dettes, revenus, noms des sociétés, devise de consolidation.', parameters: { type: 'object', properties: { periodDays: { type: 'number' } } } },
  { name: 'get_company_dashboard', description: 'Tableau de bord d\'une société (type, pays, devise).', parameters: { type: 'object', properties: { companyId: { type: 'string' } }, required: ['companyId'] } },
  { name: 'get_global_forecast', description: 'Prévision de trésorerie consolidée.', parameters: { type: 'object', properties: { periodMonths: { type: 'number' } } } },
  { name: 'get_company_forecast', description: 'Prévision d\'une société.', parameters: { type: 'object', properties: { companyId: { type: 'string' }, months: { type: 'number' } }, required: ['companyId'] } },
  { name: 'get_overdue_debts', description: 'Dettes en retard.', parameters: { type: 'object', properties: {} } },
  { name: 'get_due_soon_debts', description: 'Dettes à échéance proche.', parameters: { type: 'object', properties: { days: { type: 'number' } } } },
  { name: 'get_unreceived_revenues', description: 'Revenus non encaissés.', parameters: { type: 'object', properties: {} } },
  { name: 'get_recent_alerts', description: 'Alertes récentes (groupées par sévérité, critiques en premier, noms de sociétés).', parameters: { type: 'object', properties: {} } },
  { name: 'get_daily_plan', description: 'Plan du jour.', parameters: { type: 'object', properties: { date: { type: 'string' } } } },
  { name: 'get_open_tasks', description: 'Tâches ouvertes (exclut done/cancelled, avec scope et société).', parameters: { type: 'object', properties: {} } },
  { name: 'get_sprint_summary', description: 'Résumé d\'un sprint.', parameters: { type: 'object', properties: { sprintId: { type: 'string' } }, required: ['sprintId'] } },
  { name: 'get_safe_withdrawal_capacity', description: 'Capacité de retrait sécurisée.', parameters: { type: 'object', properties: {} } },
  { name: 'create_task', description: 'Créer une tâche. Nécessite confirmation si priorité haute.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' }, companyId: { type: 'string' } }, required: ['title'] } },
  { name: 'create_recommendation', description: 'Créer une recommandation proactive.', parameters: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, severity: { type: 'string' }, recommendationType: { type: 'string' } }, required: ['title', 'recommendationType'] } },
  { name: 'propose_create_sprint', description: 'Proposer la création d\'un sprint. Nécessite confirmation utilisateur. Ne pas exécuter directement.', parameters: { type: 'object', properties: { title: { type: 'string' }, goal: { type: 'string' }, scopeType: { type: 'string', enum: ['global', 'business', 'personal'] }, companyId: { type: 'string' }, durationDays: { type: 'number' } }, required: ['title', 'scopeType'] } },
]

export function toOpenAIChatTools() {
  return TOOL_DEFINITIONS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}
