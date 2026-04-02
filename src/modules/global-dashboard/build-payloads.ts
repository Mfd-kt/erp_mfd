import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { GlobalCompanyFxRow, GlobalDashboardData } from './types'

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function fmtRate(r: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 8 }).format(r)
}

const SCOPE_LABELS = {
  all: 'Tout (pro + perso)',
  business: 'Professionnel uniquement',
  personal: 'Personnel uniquement',
} as const

const RISK_LABEL_FR: Record<GlobalDashboardData['riskLevel'], string> = {
  low: 'Faible',
  medium: 'Modéré',
  high: 'Élevé',
  critical: 'Critique',
}

function linesCashDebtsRecv(
  rows: GlobalCompanyFxRow[],
  base: string,
  field: 'cash' | 'openDebts' | 'receivables'
): GroupExplainPayload['lines'] {
  return rows.map((r) => {
    const slice = r[field]
    const baseAmt = slice.inBase
    if (r.rateRefMissing || baseAmt == null) {
      return {
        label: r.companyName,
        value: fmt(slice.local, r.currency),
        meta: `Taux ${r.currency} → ${base} manquant (effet ≤ ${r.refDate}) — non inclus dans le total ${base}.`,
      }
    }
    return {
      label: r.companyName,
      value: `${fmt(slice.local, r.currency)} → ${fmt(baseAmt, base)}`,
      meta: `Taux ${r.currency}→${base} = ${fmtRate(r.rateRef!)} · ref. ${r.refDate}`,
    }
  })
}

function linesSafetyBuffer(rows: GlobalCompanyFxRow[], base: string): GroupExplainPayload['lines'] {
  return rows.map((r) => {
    const slice = r.safetyBuffer
    const baseAmt = slice.inBase
    if (r.rateRefMissing || baseAmt == null) {
      return {
        label: r.companyName,
        value: fmt(slice.local, r.currency),
        meta: `Tampon local non converti — taux manquant.`,
      }
    }
    return {
      label: r.companyName,
      value: `${fmt(slice.local, r.currency)} → ${fmt(baseAmt, base)}`,
      meta: `Taux ${fmtRate(r.rateRef!)} · ref. ${r.refDate}`,
    }
  })
}

function linesLastPeriodClosing(rows: GlobalCompanyFxRow[], base: string): GroupExplainPayload['lines'] {
  return rows.map((r) => {
    const lp = r.lastPeriodClosing
    if (lp.rateMissing || lp.inBase == null) {
      return {
        label: r.companyName,
        value: fmt(lp.local, r.currency),
        meta: `Clôture projetée (fin période) — taux manquant (effet ≤ ${lp.periodStartDate}).`,
      }
    }
    return {
      label: r.companyName,
      value: `${fmt(lp.local, r.currency)} → ${fmt(lp.inBase, base)}`,
      meta: `Taux ${fmtRate(lp.rate!)} · début période ${lp.periodStartDate}`,
    }
  })
}

export interface GlobalDashboardExplains {
  cash: GroupExplainPayload
  openObligations: GroupExplainPayload
  receivables: GroupExplainPayload
  projectedClosing: GroupExplainPayload
  risk: GroupExplainPayload
  safeWithdrawal: GroupExplainPayload
}

export function buildGlobalDashboardExplains(data: GlobalDashboardData): GlobalDashboardExplains {
  const base = data.baseCurrency
  const rows = data.companyFxRows
  const scopeLabel = SCOPE_LABELS[data.scope]
  const periodNote = `${data.periodDays} jours (${data.lastHorizonLabel || 'dernier mois'}).`

  const footIncomplete = data.incomplete
    ? ` Taux manquants : ${data.missingExchangeRates.join(', ') || '—'} — les montants sans taux ne sont pas inclus dans les totaux ${base}.`
    : ''

  const cash: GroupExplainPayload = {
    title: 'Trésorerie consolidée',
    intro: `Somme des soldes des comptes actifs (accounts_with_balance), convertie en ${base}. Périmètre : ${scopeLabel}.`,
    formula:
      `Pour chaque société : Σ(computed_balance ou opening_balance) en devise locale, puis conversion avec exchange_rates (dernier taux avec rate_date ≤ date de référence de prévision, typiquement début du mois courant). Date tableau de bord : ${data.asOfDate}.`,
    lines: linesCashDebtsRecv(rows, base, 'cash'),
    footnote:
      `Total affiché : ${fmt(data.totalCash, base)}.${footIncomplete}`,
  }

  const openObligations: GroupExplainPayload = {
    title: 'Obligations ouvertes',
    intro: `Restants dus sur les dettes hors statuts payé / annulé (debts_with_remaining), convertis en ${base}.`,
    formula:
      'Σ remaining_company_currency par société, filtre computed_status ∉ { paid, cancelled }, puis conversion FX comme la trésorerie.',
    lines: linesCashDebtsRecv(rows, base, 'openDebts'),
    footnote: `Total affiché : ${fmt(data.openObligations, base)}.${footIncomplete}`,
  }

  const receivables: GroupExplainPayload = {
    title: 'À recevoir',
    intro: `Encours revenus : max(0, amount_expected − amount_received) par ligne revenu non annulée, consolidé en ${base}.`,
    formula:
      'Pour chaque société : somme des restants positifs sur les revenus (status ≠ cancelled), puis conversion vers ' + base + '.',
    lines: linesCashDebtsRecv(rows, base, 'receivables'),
    footnote: `Total affiché : ${fmt(data.receivables, base)}.${footIncomplete}`,
  }

  const projectedClosing: GroupExplainPayload = {
    title: 'Clôture projetée',
    intro: `Trésorerie de clôture projetée pour le **dernier mois de l’horizon** (${periodNote}), somme des entités en ${base}.`,
    formula:
      'Pour chaque société : valeur `closingCashProjected` du dernier mois de la prévision sur la période filtrée ; conversion avec le taux à la date de début de ce mois de prévision.',
    lines: [
      { label: 'Par entité (montant local → équivalent)', value: '', meta: undefined },
      ...linesLastPeriodClosing(rows, base),
    ],
    footnote: `Valeur carte : ${fmt(data.projectedClosingCash, base)} (fin horizon : ${data.lastHorizonLabel || '—'}).${footIncomplete}`,
  }

  const risk: GroupExplainPayload = {
    title: 'Niveau de risque',
    intro: 'Indicateur qualitatif basé sur la clôture projetée (fin horizon), le volume d’obligations ouvertes et le nombre de dettes en retard.',
    formula:
      'Si clôture &lt; 0 ou retards &gt; 3 → critique. Sinon si clôture &lt; 30 % des obligations ou au moins un retard → élevé. Sinon si clôture &lt; obligations → modéré. Sinon faible.',
    lines: [
      {
        label: 'Clôture projetée (fin horizon)',
        value: fmt(data.projectedClosingCash, base),
        meta: 'Après conversion FX',
      },
      {
        label: 'Obligations ouvertes (consolidé)',
        value: fmt(data.openObligations, base),
        meta: undefined,
      },
      {
        label: 'Dettes en retard (nombre)',
        value: String(data.overdueObligations.length),
        meta: 'Toutes entités du périmètre',
      },
    ],
    footnote: `Niveau affiché : ${RISK_LABEL_FR[data.riskLevel]}.`,
  }

  const safeWithdrawal: GroupExplainPayload = {
    title: 'Retrait sécurisé',
    intro:
      'Capacité de retrait après déduction d’un tampon (somme des montants des règles récurrentes actives par société, ramenée en ' +
      base +
      ').',
    formula: `max(0, clôture projetée fin horizon − tampon consolidé). Tampon = 1 mois de charges récurrentes fixes (somme des recurring_rules actives).`,
    lines: [
      { label: 'Clôture projetée (dernier mois horizon)', value: '', meta: undefined },
      ...linesLastPeriodClosing(rows, base),
      { label: 'Tampon par entité', value: '', meta: undefined },
      ...linesSafetyBuffer(rows, base),
      {
        label: 'Formule globale',
        value: `${fmt(data.projectedClosingCash, base)} − ${fmt(data.safetyBuffer, base)}`,
        meta: `Plancher à 0 → affiché : ${fmt(data.safeWithdrawalCapacity, base)}`,
      },
    ],
    footnote: footIncomplete || undefined,
  }

  return {
    cash,
    openObligations,
    receivables,
    projectedClosing,
    risk,
    safeWithdrawal,
  }
}
