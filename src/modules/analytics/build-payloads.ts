import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { GroupAnalytics, CompanyAnalytics } from './types'

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function footnoteFx(a: GroupAnalytics): string {
  if (a.incomplete && a.missingExchangeRates && a.missingExchangeRates.length > 0) {
    return ` Taux manquants : ${a.missingExchangeRates.join(' · ')} — montants concernés exclus des totaux consolidés.`
  }
  return ''
}

export interface GroupAnalyticsSummaryExplains {
  expenses: GroupExplainPayload
  revenues: GroupExplainPayload
  netResult: GroupExplainPayload
  overdue: GroupExplainPayload
}

export function buildGroupAnalyticsSummaryExplains(a: GroupAnalytics): GroupAnalyticsSummaryExplains {
  const base = a.baseCurrency
  const fx = footnoteFx(a)
  const { from, to } = a.dateRange

  const expenses: GroupExplainPayload = {
    title: 'Dépenses (période)',
    intro: `Paiements enregistrés entre ${from} et ${to}, consolidés en ${base} (taux en vigueur à la date ${to}).`,
    formula:
      'Pour chaque société : somme des paiements (montants en devise société) sur la période ; conversion stricte avec exchange_rates ; agrégation par catégorie puis somme.',
    lines: a.expensesByCategory.slice(0, 20).map((row) => ({
      label: row.categoryName,
      value: fmt(row.total, base),
      meta: 'Part du total consolidé',
    })),
    footnote: `Total affiché sur la carte : ${fmt(a.summary.totalExpenses, base)}.${fx}`,
  }

  const revenues: GroupExplainPayload = {
    title: 'Revenus (période)',
    intro: `Encaissements (amount_received) sur les revenus dans la fenêtre ${from} → ${to}, convertis en ${base}.`,
    formula:
      'Par entité : somme des encaissements revenus sur la période ; conversion vers ' + base + ' ; somme groupe.',
    lines: a.byCompany.map((c) => ({
      label: c.companyName,
      value: fmt(c.totalRevenues, c.currency),
      meta: 'Montant en devise société (avant conversion)',
    })),
    footnote: `Total carte : ${fmt(a.summary.totalRevenues, base)}.${fx}`,
  }

  const netResult: GroupExplainPayload = {
    title: 'Résultat net',
    intro: 'Différence entre total revenus et total dépenses, tous deux exprimés en devise du groupe après conversion.',
    formula: 'Résultat net = Revenus consolidés − Dépenses consolidés.',
    lines: [
      { label: 'Revenus consolidés', value: fmt(a.summary.totalRevenues, base), meta: undefined },
      { label: 'Dépenses consolidées', value: fmt(a.summary.totalExpenses, base), meta: undefined },
      { label: 'Résultat net', value: fmt(a.summary.netResult, base), meta: undefined },
    ],
    footnote: fx.trim() || undefined,
  }

  const overdue: GroupExplainPayload = {
    title: 'Dettes en retard',
    intro: 'Somme des restants dus sur les dettes dont le statut calculé est « en retard ».',
    formula:
      'Vue debts_with_remaining : filtre overdue ; somme des remaining_company_currency par société puis conversion FX vers ' +
      base +
      '.',
    lines: a.byCompany.map((c) => ({
      label: c.companyName,
      value: fmt(c.overdueDebts, c.currency),
      meta: 'Encours en retard (devise société)',
    })),
    footnote: `Total carte : ${fmt(a.summary.overdueDebts, base)}.${fx}`,
  }

  return { expenses, revenues, netResult, overdue }
}

/** Explications KPI analytique — vue une société (même structure que groupe, détail par catégorie / pas de ventilation multi-sociétés). */
export function buildCompanyAnalyticsSummaryExplains(a: CompanyAnalytics): GroupAnalyticsSummaryExplains {
  const base = a.currency
  const { from, to } = a.dateRange

  const expenses: GroupExplainPayload = {
    title: 'Dépenses (période)',
    intro: `Somme des paiements enregistrés pour cette société entre ${from} et ${to}, exprimés en ${base} (devise société).`,
    formula:
      'Σ amount_company_currency sur la table payments où payment_date ∈ [from, to]. Ventilation par catégorie de dette via la dette liée.',
    lines: a.expensesByCategory.slice(0, 24).map((row) => ({
      label: row.categoryName,
      value: fmt(row.total, base),
      meta: 'Part du total période',
    })),
    footnote: `Total carte : ${fmt(a.summary.totalExpenses, base)}.`,
  }

  const revenues: GroupExplainPayload = {
    title: 'Revenus (période)',
    intro: `Encaissements (revenus) enregistrés dans la fenêtre ${from} → ${to}, en ${base}.`,
    formula:
      'Somme des encaissements sur les lignes de revenus dont la date d’encaissement ou la période correspond à la période sélectionnée (logique métier getRevenuesInRange).',
    lines: [],
    footnote: `Total carte : ${fmt(a.summary.totalRevenues, base)}.`,
  }

  const netResult: GroupExplainPayload = {
    title: 'Résultat net',
    intro: 'Différence entre total revenus et total dépenses sur la période, en devise société.',
    formula: 'Résultat net = Revenus (période) − Dépenses (période).',
    lines: [
      { label: 'Revenus consolidés', value: fmt(a.summary.totalRevenues, base) },
      { label: 'Dépenses consolidées', value: fmt(a.summary.totalExpenses, base) },
      { label: 'Résultat net', value: fmt(a.summary.netResult, base) },
    ],
  }

  const overdue: GroupExplainPayload = {
    title: 'Dettes en retard',
    intro: 'Somme des restants dus sur les dettes dont le statut calculé est « en retard » à la date du calcul.',
    formula:
      'Vue debts_with_remaining : filtre overdue ; somme des remaining_company_currency.',
    lines: [],
    footnote: `Total carte : ${fmt(a.summary.overdueDebts, base)}.`,
  }

  return { expenses, revenues, netResult, overdue }
}
