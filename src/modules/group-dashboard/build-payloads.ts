import type { Company } from '@/lib/supabase/types'
import type { Alert } from '@/modules/alerts/types'
import type { DebtFxBreakdown } from './group-fx'
import type { GroupExplainPayload } from './types'

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function fmtRate(r: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 8 }).format(r)
}

type DebtRow = {
  id: string
  company_id: string
  title: string
  remaining_company_currency: number | string
  computed_status: string
  priority: string
}

type RevenueRow = {
  id: string
  company_id: string
  title: string
  amount_expected: number | string
  amount_received: number | string
  status: string
}

function companyLabel(c: Company) {
  return c.trade_name ?? c.legal_name
}

export function buildOpenDebtsExplain(
  fx: DebtFxBreakdown,
  companies: Company[]
): GroupExplainPayload {
  const base = fx.baseCurrency
  const aggLines = fx.byCompany.map((row) => {
    if (row.rateMissing) {
      return {
        label: row.label,
        value: fmt(row.totalLocal, row.currency),
        meta: `Taux ${row.currency} → ${base} manquant dans « Taux de change » — non inclus dans le total ${base}.`,
      }
    }
    return {
      label: row.label,
      value: row.totalInBase != null ? fmt(row.totalInBase, base) : '—',
      meta: `${fmt(row.totalLocal, row.currency)} × ${fmtRate(row.rate!)} (${row.currency}→${base})`,
    }
  })

  const detailLines = fx.debtLines.map((d) => {
    if (d.rateMissing) {
      return {
        label: d.title,
        value: fmt(d.local, d.currency),
        meta: `${d.companyLabel} · conversion vers ${base} impossible (taux manquant)`,
      }
    }
    return {
      label: d.title,
      value: `${fmt(d.local, d.currency)} → ${fmt(d.inBase!, base)}`,
      meta: `${d.companyLabel} · taux ${fmtRate(d.rate!)}`,
    }
  })

  const lines: { label: string; value: string; meta?: string }[] = []
  lines.push(...aggLines)
  if (detailLines.length > 0) {
    lines.push({ label: 'Détail par dette', value: '', meta: undefined })
    lines.push(...detailLines)
  }
  if (lines.length === 0) {
    lines.push({ label: 'Aucune dette ouverte', value: '—', meta: undefined })
  }

  const footParts: string[] = [
    `Total consolidé en ${base} : somme des restants dus convertis avec les taux enregistrés (table exchange_rates, date d’effet ≤ ${fx.asOfDate}).`,
  ]
  if (fx.hasMissingRate) {
    footParts.push(
      'Certaines sociétés ont une devise sans taux vers la devise du groupe : leur montant local est affiché mais n’est pas ajouté au total consolidé tant qu’un taux est manquant.'
    )
  }

  return {
    title: 'Dettes ouvertes (vue groupe)',
    intro: `Vue consolidée en ${base} pour le groupe (${companies.length} entité(s)).`,
    formula:
      'Étape 1 : vue `debts_with_remaining`, restant en devise société, hors statuts payé / annulé. Étape 2 : pour chaque société, taux = dernier enregistrement exchange_rates où from = devise société, to = devise du groupe, date d’effet ≤ date de référence. Montant en ' +
      base +
      ' = restant local × taux (1 unité locale = taux unités ' +
      base +
      ').',
    lines,
    footnote: footParts.join(' '),
  }
}

export function buildOverdueExplain(fx: DebtFxBreakdown): GroupExplainPayload {
  const base = fx.baseCurrency
  const lines = fx.debtLines.map((d) => {
    if (d.rateMissing) {
      return {
        label: d.title,
        value: fmt(d.local, d.currency),
        meta: `${d.companyLabel} · priorité — conversion ${base} indisponible (taux manquant)`,
      }
    }
    return {
      label: d.title,
      value: `${fmt(d.local, d.currency)} → ${fmt(d.inBase!, base)}`,
      meta: `${d.companyLabel} · taux ${fmtRate(d.rate!)}`,
    }
  })

  const foot: string[] = [
    `Total « En retard » sur la carte : somme des montants convertis en ${base} (${fx.debtLines.length} dette(s)). Référence taux : ${fx.asOfDate}.`,
  ]
  if (fx.hasMissingRate) {
    foot.push('Les lignes sans taux FX ne sont pas incluses dans le total consolidé.')
  }

  return {
    title: 'Dettes en retard',
    intro: `Dettes avec statut calculé « en retard » (échéance passée, solde &gt; 0), converties en ${base} comme la carte KPI.`,
    formula:
      'Filtre : computed_status = overdue sur `debts_with_remaining`. Conversion : même règle que « Dettes ouvertes » (table exchange_rates).',
    lines: lines.length > 0 ? lines : [{ label: 'Aucune dette en retard', value: '—', meta: undefined }],
    footnote: foot.join(' '),
  }
}

export function buildRevenuesExplain(
  revenues: RevenueRow[] | null | undefined,
  companies: Company[],
  totalExpected: number,
  totalReceived: number,
  displayCurrency: string
): GroupExplainPayload {
  const cmap = new Map(companies.map((c) => [c.id, c]))
  const active = revenues?.filter((r) => r.status !== 'cancelled') ?? []

  const lines = active.map((r) => {
    const c = cmap.get(r.company_id)
    const cur = c?.default_currency ?? 'EUR'
    const exp = Number(r.amount_expected)
    const rec = Number(r.amount_received)
    return {
      label: r.title,
      value: `${fmt(exp, cur)} · reçu ${fmt(rec, cur)}`,
      meta: c ? companyLabel(c) : r.company_id,
    }
  })

  return {
    title: 'Revenus attendus (groupe)',
    intro: 'Agrégation des lignes revenus non annulées, toutes sociétés confondues.',
    formula: `Total attendu affiché = Σ amount_expected (statut ≠ annulé). Total reçus affiché = Σ amount_received sur toutes les lignes. Valeurs carte : ${fmt(totalExpected, displayCurrency)} / ${fmt(totalReceived, displayCurrency)} (format ${displayCurrency}).`,
    lines,
    footnote:
      'Les montants sont saisis en devise de la société ; le total formaté sur la carte peut mélanger des devises si les entités diffèrent.',
  }
}

export function buildEntitiesExplain(companies: Company[]): GroupExplainPayload {
  return {
    title: 'Entités actives',
    intro: 'Nombre de sociétés rattachées à votre périmètre d’accès pour ce groupe.',
    formula:
      'Liste chargée via `getAccessScope()` : entreprises visibles pour l’utilisateur (ex. tous les `company_id` du groupe pour un admin groupe).',
    lines: companies.map((c) => ({
      label: companyLabel(c),
      value: c.is_active ? 'Active' : 'Inactive',
      meta: `${c.country_code} · ${c.default_currency}`,
    })),
  }
}

export function buildAlertsSeverityExplain(severity: 'critical' | 'warning' | 'info', alerts: Alert[], label: string): GroupExplainPayload {
  const filtered = alerts.filter((a) => a.severity === severity)
  return {
    title: `Alertes — ${label}`,
    intro: `Comptage des alertes générées par le moteur groupe dont la sévérité est « ${severity} ».`,
    formula:
      'Service `computeGroupAlerts` : prévision groupe, taux FX manquants, etc. Chaque règle métier ajoute une entrée dans la liste.',
    lines: filtered.map((a) => ({
      label: a.title,
      value: a.alertType,
      meta: a.message,
    })),
  }
}

export function buildEntityOpenDebtExplain(
  company: Company,
  debts: DebtRow[]
): GroupExplainPayload {
  const open = debts.filter((d) => d.computed_status !== 'paid' && d.computed_status !== 'cancelled')
  const cur = company.default_currency
  const sum = open.reduce((s, d) => s + Number(d.remaining_company_currency), 0)

  const lines = open.map((d) => ({
    label: d.title,
    value: fmt(Number(d.remaining_company_currency), cur),
    meta: `Statut calculé : ${d.computed_status} · priorité ${d.priority}`,
  }))

  return {
    title: `Dettes ouvertes — ${companyLabel(company)}`,
    intro: `Restant dû total pour cette société : ${fmt(sum, cur)}.`,
    formula:
      'Même logique que la vue groupe : `debts_with_remaining` filtrée sur company_id, statuts hors payé/annulé.',
    lines: lines.length > 0 ? lines : [{ label: 'Aucune dette ouverte', value: '—', meta: undefined }],
  }
}
