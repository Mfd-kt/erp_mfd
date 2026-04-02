/**
 * Textes d’aide « origine du calcul » pour les vues société (KPI, sections).
 * Format aligné sur GroupExplainPayload (popups DataExplainDialog).
 */
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'

export const KPI_EXPLAIN = {
  /** Tableau de bord — Trésorerie disponible */
  dashboardTotalCash: (): GroupExplainPayload => ({
    title: 'Trésorerie disponible',
    intro: 'Vue consolidée de la liquidité sur tous les comptes actifs de la société.',
    formula:
      'Somme des soldes calculés (computed_balance) de la vue accounts_with_balance pour chaque compte avec is_active = true.',
    lines: [],
    footnote:
      'Le solde par compte inclut solde d’ouverture, mouvements (paiements, revenus) et ajustement de réconciliation éventuel.',
  }),

  dashboardOpenDebts: (): GroupExplainPayload => ({
    title: 'Dettes ouvertes',
    intro: 'Encours total des obligations non soldées (hors statuts payé / annulé).',
    formula:
      'Σ remaining_company_currency sur debts_with_remaining où le statut calculé n’est ni « payé » ni « annulé ».',
    lines: [],
  }),

  dashboardOverdueCount: (): GroupExplainPayload => ({
    title: 'Dettes en retard',
    intro: 'Nombre de dettes dont la date d’échéance est dépassée et le solde restant positif.',
    formula: 'Compte des lignes debts_with_remaining avec computed_status = overdue.',
    lines: [],
  }),

  dashboardExpectedRevenueMonth: (): GroupExplainPayload => ({
    title: 'Revenus attendus ce mois',
    intro: 'Montant contractuellement attendu sur le mois civil en cours (selon dates prévues des revenus).',
    formula:
      'Agrégation des revenus actifs dont la fenêtre « attendu » intersecte le mois courant, en devise société.',
    lines: [],
  }),

  dashboardReceivedRevenueMonth: (): GroupExplainPayload => ({
    title: 'Revenus reçus ce mois',
    intro: 'Encaissements réellement enregistrés sur le mois civil en cours.',
    formula:
      'Somme des amount_received sur les mouvements d’encaissement dont la date tombe dans le mois courant.',
    lines: [],
  }),

  dashboardNetProjection: (): GroupExplainPayload => ({
    title: 'Projection nette (indicateur synthétique)',
    intro: 'Lecture rapide : revenus attendus du mois moins l’encours total des dettes ouvertes.',
    formula: 'Revenus attendus ce mois − Total dettes ouvertes (tous deux en devise société).',
    lines: [],
    footnote:
      'Indicateur de lecture ; la prévision de trésorerie détaillée est dans Prévision et utilise des flux projetés mois par mois.',
  }),

  dashboardProjectionEndMonth: (monthLabel: string): GroupExplainPayload => ({
    title: `Trésorerie fin ${monthLabel}`,
    intro: 'Projection de clôture pour le mois affiché sur la carte.',
    formula:
      'D’après le moteur de prévision : trésorerie d’ouverture du mois + entrées attendues − sorties attendues (échéances, récurrents simulés, revenus).',
    lines: [],
    footnote: 'Voir la page Prévision pour le détail des lignes et les avertissements de fiabilité.',
  }),

  dashboardProjectionNextMonth: (): GroupExplainPayload => ({
    title: 'Mois suivant (vue isolée)',
    intro:
      'À partir de la trésorerie actuelle, simulation des seuls flux du mois suivant (sans enchaîner la clôture du mois en cours comme nouveau départ).',
    formula: 'Trésorerie actuelle + entrées M+1 − sorties M+1 (prévision).',
    lines: [],
    footnote: 'Permet de voir l’impact « d’un mois » sur la position actuelle.',
  }),

  dashboardAlertsCritical: (): GroupExplainPayload => ({
    title: 'Alertes critiques',
    intro: 'Signaux nécessitant une action immédiate (trésorerie, échéances critiques, etc.).',
    formula: 'Compte des alertes générées par le moteur computeCompanyAlerts avec niveau « critical ».',
    lines: [],
  }),

  dashboardAlertsWarnings: (): GroupExplainPayload => ({
    title: 'Alertes avertissement',
    intro: 'Risques ou anomalies à surveiller sans urgence immédiate.',
    formula: 'Compte des alertes avec niveau « warning ».',
    lines: [],
  }),

  dashboardAlertsInfos: (): GroupExplainPayload => ({
    title: 'Alertes information',
    intro: 'Informations utiles à la décision, sans caractère d’alerte bloquante.',
    formula: 'Compte des alertes avec niveau « info ».',
    lines: [],
  }),

  sectionProjectionTreasury: (): GroupExplainPayload => ({
    title: 'Bloc « Projection de trésorerie »',
    intro:
      'Résumé des deux premiers horizons de la prévision (fin de mois en cours, mois suivant) et accès à la prévision complète.',
    formula:
      'Les montants proviennent du même moteur que la page Prévision (generateCompanyForecast). Les définitions exactes par ligne sont dans les popups de chaque carte.',
    lines: [],
  }),

  sectionAccountsPreview: (): GroupExplainPayload => ({
    title: 'Aperçu des comptes',
    intro: 'Liste raccourcie des comptes actifs avec le solde courant utilisé dans la trésorerie.',
    formula: 'Pour chaque compte : computed_balance (ou équivalent) issu de accounts_with_balance.',
    lines: [],
  }),

  sectionPriorityDebts: (): GroupExplainPayload => ({
    title: 'Dettes prioritaires',
    intro: 'Sous-ensemble des dettes ouvertes affiché pour focus (les plus sensibles en tête selon tri métier).',
    formula: 'Dettes non soldées, tri par priorité / échéance ; montant = remaining_company_currency.',
    lines: [],
  }),

  /** Dettes — liste */
  debtsTotalOpen: (): GroupExplainPayload => ({
    title: 'Total ouvert',
    intro: 'Somme des restants dus sur les dettes non soldées, dans le périmètre des filtres actifs.',
    formula: 'Σ remaining_company_currency pour les dettes dont le statut ≠ payé / annulé (liste déjà filtrée côté serveur).',
    lines: [],
    footnote: 'Si vous changez les filtres (statut, priorité, créancier, catégorie), les KPI se recalculent sur ce sous-ensemble.',
  }),

  debtsTotalOverdue: (): GroupExplainPayload => ({
    title: 'En retard (montant)',
    intro: 'Encours cumulé des dettes en statut « en retard », dans le périmètre des filtres.',
    formula: 'Σ remaining_company_currency où computed_status = overdue.',
    lines: [],
    footnote: 'Même périmètre que le tableau et les autres KPI de cette page.',
  }),

  debtsOpenCount: (): GroupExplainPayload => ({
    title: 'Nombre de dettes ouvertes',
    intro: 'Compte des dettes non soldées dans le périmètre filtré.',
    formula: 'Nombre de lignes ouvertes après application des filtres.',
    lines: [],
  }),

  debtsCriticalCount: (): GroupExplainPayload => ({
    title: 'Dettes critiques',
    intro: 'Nombre de dettes en priorité « critique » parmi les dettes ouvertes filtrées.',
    formula: 'Filtre priority = critical sur les dettes ouvertes du jeu courant.',
    lines: [],
  }),

  /** Paiements */
  paymentsThisMonth: (): GroupExplainPayload => ({
    title: 'Paiements — ce mois',
    intro: 'Total des règlements enregistrés dont la date de paiement est dans le mois civil en cours.',
    formula: 'Σ amount_company_currency des paiements avec payment_date dans [début du mois, fin du mois].',
    lines: [],
  }),

  paymentsLastMonth: (): GroupExplainPayload => ({
    title: 'Paiements — mois dernier',
    intro: 'Même logique que « ce mois », pour le mois civil précédent.',
    formula: 'Σ amount_company_currency sur la fenêtre du mois M-1.',
    lines: [],
  }),

  paymentsCount: (): GroupExplainPayload => ({
    title: 'Nombre de paiements',
    intro: 'Nombre total d’écritures de paiement enregistrées (historique complet).',
    formula: 'COUNT(*) sur la table payments pour la société.',
    lines: [],
  }),

  /** Revenus */
  revenuesTotalExpected: (): GroupExplainPayload => ({
    title: 'Total attendu',
    intro: 'Somme des montants encore attendus sur l’ensemble des lignes de revenus (hors soldés).',
    formula: 'Agrégation des montants « attendus » restants selon le modèle revenu.',
    lines: [],
  }),

  revenuesTotalReceived: (): GroupExplainPayload => ({
    title: 'Total reçu',
    intro: 'Cumul des encaissements enregistrés sur les revenus.',
    formula: 'Σ des amount_received (ou équivalent) sur les revenus de la société.',
    lines: [],
  }),

  revenuesExpectedThisMonth: (): GroupExplainPayload => ({
    title: 'Attendus ce mois',
    intro: 'Part des revenus attendue sur le mois civil en cours.',
    formula: 'Filtre sur la période attendue intersectant le mois courant.',
    lines: [],
  }),

  revenuesReceivedThisMonth: (): GroupExplainPayload => ({
    title: 'Reçus ce mois',
    intro: 'Encaissements réellement constatés ce mois-ci.',
    formula: 'Somme des encaissements dont la date tombe dans le mois courant.',
    lines: [],
  }),

  /** Comptes */
  accountsTotalTreasury: (): GroupExplainPayload => ({
    title: 'Trésorerie totale',
    intro: 'Addition des soldes courants des comptes listés (après recherche / filtre).',
    formula: 'Σ computed_balance (ou opening si absent) pour les lignes affichées.',
    lines: [],
  }),

  accountsActiveCount: (): GroupExplainPayload => ({
    title: 'Comptes actifs',
    intro: 'Nombre de comptes avec statut actif dans la liste courante.',
    formula: 'Compte des comptes où is_active = true.',
    lines: [],
  }),

  accountsNegativeCount: (): GroupExplainPayload => ({
    title: 'Soldes négatifs',
    intro: 'Nombre de comptes dont le solde calculé est strictement négatif.',
    formula: 'Filtre computed_balance < 0 sur les comptes affichés.',
    lines: [],
  }),

  /** Alertes page */
  alertsCritical: (): GroupExplainPayload => ({
    title: 'Compteur — critiques',
    intro: 'Nombre d’alertes actives classées critique.',
    formula: 'Règles métier dans computeCompanyAlerts (seuils, retards, trésorerie).',
    lines: [],
  }),

  alertsWarnings: (): GroupExplainPayload => ({
    title: 'Compteur — avertissements',
    intro: 'Nombre d’alertes de niveau avertissement.',
    formula: 'Agrégation des alertes warning pour la société.',
    lines: [],
  }),

  alertsInfos: (): GroupExplainPayload => ({
    title: 'Compteur — informations',
    intro: 'Nombre d’alertes purement informatives.',
    formula: 'Agrégation des alertes info.',
    lines: [],
  }),

  pageActivity: (): GroupExplainPayload => ({
    title: 'Activité',
    intro: 'Journal chronologique des opérations et événements système sur cette société.',
    formula:
      'Chaque ligne est un enregistrement activity_logs ; filtres optionnels par type d’action ou d’entité. Aucun agrégat monétaire sur cet écran.',
    lines: [],
  }),

  /** Activité */
  activityLog: (): GroupExplainPayload => ({
    title: 'Journal d’activité',
    intro: 'Historique des actions utilisateurs et automatismes sur la société.',
    formula:
      'Lecture de la table activity_logs filtrée par company_id, tri chronologique inverse. Pas de « calcul » agrégé : journal événementiel.',
    lines: [],
  }),

  /** Référentiel générique */
  pageDashboard: (): GroupExplainPayload => ({
    title: 'Tableau de bord société',
    intro:
      'Vue d’ensemble : liquidité, dettes, revenus du mois, projection synthétique et alertes. Chaque carte dispose d’une aide propre.',
    formula:
      'Aucun « grand total » unique : chaque indicateur est calculé indépendamment à partir des tables comptes, dettes, revenus, paiements et du moteur de prévision.',
    lines: [],
  }),

  pageForecast: (): GroupExplainPayload => ({
    title: 'Prévision de trésorerie',
    intro:
      'Simulation mois par mois des entrées et sorties à partir des dettes, revenus, règles récurrentes et hypothèses du modèle. Le résumé distingue la trésorerie de clôture (mois en cours, suivant, fin d’horizon) et la réserve sur six mois (matelas à réserver vs hors matelas).',
    formula:
      'Clôture = ouverture + entrées − sorties. Matelas = Σ sorties des six mois suivant le mois en cours. Hors matelas = clôture de ce mois − matelas (voir les popups de chaque carte).',
    lines: [],
  }),

  sectionForecastChart: (): GroupExplainPayload => ({
    title: 'Graphique — Évolution de trésorerie',
    intro: 'Courbe / barres de la trésorerie projetée sur l’horizon (jusqu’à décembre).',
    formula: 'Même série que le tableau détaillé : closingCashProjected par mois issu de generateCompanyForecast.',
    lines: [],
  }),

  sectionForecastTable: (): GroupExplainPayload => ({
    title: 'Tableau — Prévision détaillée',
    intro:
      'Ligne par mois : mouvement (ouverture, entrées, sorties, clôture) puis réserve sur 6 mois : matelas = Σ sorties des mois suivants, hors matelas = clôture − matelas.',
    formula:
      'ForecastPeriod côté serveur. Matelas = somme des sorties prévues sur les 6 mois calendaires suivant la ligne (hors mois courant), tronquée si la prévision finit avant. Hors matelas = closingCashProjected − matelas (si aucun mois suivant, matelas absent → hors matelas = clôture).',
    lines: [],
  }),

  pageAnalytics: (): GroupExplainPayload => ({
    title: 'Analytique',
    intro:
      'Analyse des flux sur la période choisie : dépenses, revenus, ventilation par catégorie / créancier, vieillissement des dettes.',
    formula:
      'Les totaux KPI agrègent les paiements et revenus filtrés par dates ; les graphiques utilisent les mêmes sources avec regroupements différents.',
    lines: [],
  }),

  pageDebtDetail: (): GroupExplainPayload => ({
    title: 'Fiche dette',
    intro: 'Vue détaillée d’une obligation : montants, échéance, priorité et historique des paiements.',
    formula:
      'Restant dû (devise société) = montant de la dette converti − Σ paiements imputés (amount_company_currency). Le statut est dérivé des dates et du solde.',
    lines: [],
  }),

  debtDetailAmountTotal: (): GroupExplainPayload => ({
    title: 'Montant total (devise société)',
    intro: 'Montant de l’obligation exprimé dans la devise de reporting de la société.',
    formula: 'Montant converti depuis la devise d’origine avec le taux stocké sur la dette.',
    lines: [],
  }),

  debtDetailPaid: (): GroupExplainPayload => ({
    title: 'Total payé',
    intro: 'Somme des règlements imputés à cette dette, en devise société.',
    formula: 'Σ amount_company_currency des paiements liés à cette dette.',
    lines: [],
  }),

  debtDetailRemaining: (): GroupExplainPayload => ({
    title: 'Restant dû',
    intro: 'Encours après imputation des paiements.',
    formula: 'Montant société − total payé (ou valeur fournie par la vue debts_with_remaining).',
    lines: [],
  }),

  debtDetailPaymentsSection: (): GroupExplainPayload => ({
    title: 'Paiements sur cette dette',
    intro: 'Historique des règlements imputés à cette obligation.',
    formula: 'Sélection des paiements où debt_id = cette dette ; tri par date.',
    lines: [],
  }),

  accountDetailBalance: (): GroupExplainPayload => ({
    title: 'Solde actuel',
    intro: 'Position de trésorerie sur ce compte au dernier recalcul.',
    formula: 'Voir accounts_with_balance : ouverture + mouvements nets + réconciliation.',
    lines: [],
  }),

  accountDetailMovements: (): GroupExplainPayload => ({
    title: 'Mouvements affichés',
    intro: 'Nombre de lignes de mouvement listées (paiements sortants + encaissements entrants sur ce compte).',
    formula: 'Compte des paiements et revenus rattachés à ce account_id.',
    lines: [],
  }),

  pageAccountDetail: (): GroupExplainPayload => ({
    title: 'Fiche compte',
    intro: 'Support de trésorerie : mouvements, solde courant et réconciliation éventuelle.',
    formula:
      'Le solde affiché repose sur la vue accounts_with_balance (ouverture + mouvements + ajustement de réconciliation).',
    lines: [],
  }),

  pageDebts: (): GroupExplainPayload => ({
    title: 'Dettes',
    intro: 'Registre des obligations : montants, échéances, priorités et restant dû en devise société.',
    formula:
      'Le restant dû provient de debts_with_remaining (montant converti et paiements imputés). Les KPI en tête de page agrègent ces lignes selon les filtres.',
    lines: [],
  }),

  pagePayments: (): GroupExplainPayload => ({
    title: 'Paiements',
    intro: 'Historique des règlements enregistrés contre les dettes, avec compte de sortie et moyen de paiement.',
    formula:
      'Chaque ligne est un enregistrement dans payments ; les totaux « ce mois / mois dernier » filtrent par payment_date.',
    lines: [],
  }),

  pageRevenues: (): GroupExplainPayload => ({
    title: 'Revenus',
    intro: 'Pipeline des encaissements attendus et reçus, par contrat ou ligne de revenu.',
    formula:
      'Les montants attendus / reçus sont stockés sur les lignes revenus ; les KPI cumulent selon les dates de période.',
    lines: [],
  }),

  pageAccounts: (): GroupExplainPayload => ({
    title: 'Comptes',
    intro: 'Supports de trésorerie (banque, caisse, etc.) avec soldes calculés et réconciliation possible.',
    formula:
      'Solde courant = solde d’ouverture + mouvements − paiements + revenus + ajustement de réconciliation (selon vue accounts_with_balance).',
    lines: [],
  }),

  pageAlerts: (): GroupExplainPayload => ({
    title: 'Alertes',
    intro: 'Signaux générés automatiquement (retards, seuils, incohérences) pour prioriser les actions.',
    formula:
      'computeCompanyAlerts évalue les règles métier sur dettes, trésorerie et revenus ; les compteurs regroupent par sévérité.',
    lines: [],
  }),

  sectionAnalyticsCategory: (): GroupExplainPayload => ({
    title: 'Graphique — Dépenses par catégorie',
    intro: 'Répartition des paiements agrégés par catégorie de dette sur la période.',
    formula: 'Pour chaque paiement : catégorie de la dette liée ; somme des montants en devise société par catégorie.',
    lines: [],
  }),

  sectionAnalyticsCreditor: (): GroupExplainPayload => ({
    title: 'Graphique — Dépenses par créancier',
    intro: 'Total payé et encours par créancier sur la période.',
    formula: 'Agrégation des flux vers chaque creditor_id (paiements + restant dû selon requête analytique).',
    lines: [],
  }),

  sectionAnalyticsCashFlow: (): GroupExplainPayload => ({
    title: 'Graphique — Flux de trésorerie',
    intro: 'Entrées et sorties de trésorerie par mois sur la fenêtre sélectionnée.',
    formula: 'Sorties ≈ paiements du mois ; entrées ≈ encaissements revenus du mois (logique getCompanyAnalytics).',
    lines: [],
  }),

  sectionAnalyticsAging: (): GroupExplainPayload => ({
    title: 'Table — Vieillissement des dettes',
    intro: 'Encours classés par tranche de retard ou d’échéance.',
    formula: 'Regroupement des restants dus par bucket (non échu, bientôt dû, retard 8–30 j, 30+ j).',
    lines: [],
  }),

  sectionAnalyticsRisks: (): GroupExplainPayload => ({
    title: 'Table — Principaux risques',
    intro: 'Dettes les plus sensibles (retard imminent ou déjà en retard).',
    formula: 'Tri et filtre sur statuts overdue / due_soon et montants restants.',
    lines: [],
  }),

  automationRulesTotal: (): GroupExplainPayload => ({
    title: 'Règles d’automatisation',
    intro: 'Nombre de règles configurées pour cette société.',
    formula: 'COUNT sur les enregistrements de règles d’automatisation.',
    lines: [],
  }),

  automationRulesActiveCount: (): GroupExplainPayload => ({
    title: 'Règles actives',
    intro: 'Règles dont l’exécution est activée.',
    formula: 'Filtre is_active = true.',
    lines: [],
  }),

  automationTriggersDistinct: (): GroupExplainPayload => ({
    title: 'Déclencheurs distincts',
    intro: 'Diversité des types d’événements déclencheurs utilisés.',
    formula: 'Nombre de valeurs distinctes de trigger_type parmi les règles.',
    lines: [],
  }),

  recurringRulesTotal: (): GroupExplainPayload => ({
    title: 'Règles récurrentes',
    intro: 'Nombre de règles de récurrence (génération périodique).',
    formula: 'COUNT sur recurring_rules pour ce company_id.',
    lines: [],
  }),

  recurringRulesActiveCount: (): GroupExplainPayload => ({
    title: 'Règles actives',
    intro: 'Règles récurrentes activées.',
    formula: 'Filtre is_active = true.',
    lines: [],
  }),

  recurringRulesAutoGen: (): GroupExplainPayload => ({
    title: 'Génération automatique',
    intro: 'Règles qui créent automatiquement des dettes (ou équivalent) à l’échéance.',
    formula: 'Filtre auto_generate = true.',
    lines: [],
  }),

  recurringRulesMonthlyAmount: (): GroupExplainPayload => ({
    title: 'Récurrent mensuel (montant)',
    intro:
      'Total des montants des règles à fréquence mensuelle et actives, exprimé dans la devise par défaut de la société.',
    formula:
      'Σ amount sur recurring_rules où frequency = monthly et is_active = true, devise = devise société. Les règles mensuelles dans une autre devise sont exclues du total (voir mention sous la carte).',
    lines: [],
    footnote:
      'Les règles trimestrielles ou annuelles ne sont pas converties en équivalent mensuel ici : seules les règles explicitement « mensuelles » sont additionnées.',
  }),

  pageAutomations: (): GroupExplainPayload => ({
    title: 'Automations',
    intro: 'Règles métier déclenchées par des événements (création de paiement, dette, etc.).',
    formula:
      'Les actions sont enregistrées en base ; cette page ne montre pas de totaux financiers mais la logique et l’historique d’exécution.',
    lines: [],
  }),

  pageWebhooks: (): GroupExplainPayload => ({
    title: 'Webhooks',
    intro: 'Notifications HTTP vers vos systèmes externes lorsqu’un événement se produit dans l’ERP.',
    formula: 'Configuration d’URL, secrets et types d’événements — pas de calcul de trésorerie ici.',
    lines: [],
  }),

  pageRecurringRules: (): GroupExplainPayload => ({
    title: 'Récurrences',
    intro: 'Règles pour générer automatiquement des obligations ou rappels selon un calendrier.',
    formula:
      'Les montants impactent les dettes ou tâches créées ; la prévision inclut une simulation des récurrents (voir Prévision).',
    lines: [],
  }),

  pageNotifications: (): GroupExplainPayload => ({
    title: 'Notifications',
    intro: 'Messages in-app liés à votre compte utilisateur (événements sur les sociétés auxquelles vous avez accès).',
    formula:
      'Liste issue de notifications pour user_id = vous ; filtres statut / type. Ce n’est pas un solde comptable.',
    lines: [],
  }),

  creditorsTotal: (): GroupExplainPayload => ({
    title: 'Nombre de créanciers',
    intro: 'Nombre de fiches créanciers enregistrées pour la société.',
    formula: 'Compte des lignes du référentiel creditors pour ce company_id.',
    lines: [],
  }),

  debtCategoriesTotal: (): GroupExplainPayload => ({
    title: 'Nombre de catégories',
    intro: 'Nombre de catégories de dette définies pour la société.',
    formula: 'COUNT(*) sur debt_categories pour ce company_id.',
    lines: [],
  }),

  debtCategoriesPayroll: (): GroupExplainPayload => ({
    title: 'Catégories « paie »',
    intro: 'Catégories marquées comme liées à la paie (reporting social).',
    formula: 'Filtre is_payroll = true sur le référentiel catégories.',
    lines: [],
  }),

  debtCategoriesRecurring: (): GroupExplainPayload => ({
    title: 'Catégories récurrentes (défaut)',
    intro: 'Catégories utilisées comme modèle par défaut pour les règles récurrentes.',
    formula: 'Filtre is_recurring_default = true.',
    lines: [],
  }),

  debtTypesTotal: (): GroupExplainPayload => ({
    title: 'Types de dette',
    intro: 'Nombre de types macro (familles d’obligations) pour la société.',
    formula: 'COUNT(*) sur debt_types pour ce company_id.',
    lines: [],
  }),

  creditorsByType: (typeLabel: string): GroupExplainPayload => ({
    title: `Créanciers — ${typeLabel}`,
    intro: `Nombre de fiches dont le type est « ${typeLabel} ».`,
    formula: 'Filtre creditor_type sur le même référentiel.',
    lines: [],
  }),

  referentialList: (entityName: string): GroupExplainPayload => ({
    title: `Référentiel — ${entityName}`,
    intro: `Les données de ${entityName} servent de base aux filtres et liaisons (dettes, paiements, etc.).`,
    formula: 'Données stockées telles quelles ; pas de montant calculé sur cette liste.',
    lines: [],
    footnote: 'Les impacts financiers apparaissent sur les écrans Dettes, Paiements et Comptes.',
  }),
}
