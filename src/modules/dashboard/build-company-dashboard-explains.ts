import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { AccountWithBalance, DebtWithRemaining } from '@/lib/supabase/types'
import type { ForecastPeriod } from '@/modules/forecast/types'
import type { RevenueStats, RevenueMonthLineExpected, RevenueMonthLineReceived } from '@/modules/revenues/queries'
import type { Alert } from '@/modules/alerts/types'

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR')
  } catch {
    return iso
  }
}

export function buildDashboardCashExplain(
  accounts: AccountWithBalance[],
  totalCash: number,
  currency: string,
  companyId: string
): GroupExplainPayload {
  const lines = accounts.map((a) => ({
    label: a.name,
    value: fmt(Number(a.computed_balance ?? a.opening_balance), a.currency_code),
    meta: `${a.account_type} · ${a.currency_code}${a.currency_code !== currency ? ` (devise compte)` : ''}`,
    href: `/app/${companyId}/accounts/${a.id}`,
  }))
  lines.push({
    label: 'Total trésorerie',
    value: fmt(totalCash, currency),
    meta: 'Somme des soldes ci-dessus (conversion implicite si une seule devise de reporting)',
    href: `/app/${companyId}/accounts`,
  })
  return {
    title: 'Trésorerie disponible — détail',
    intro: 'Chaque ligne est un compte actif ; le total correspond à la carte du tableau de bord.',
    formula: 'Σ computed_balance (ou équivalent) sur accounts_with_balance pour is_active = true.',
    lines,
  }
}

export function buildDashboardOpenDebtsExplain(
  debts: DebtWithRemaining[],
  totalOpenDebt: number,
  currency: string,
  companyId: string
): GroupExplainPayload {
  const sorted = [...debts].sort((a, b) => {
    const da = a.due_date ?? ''
    const db = b.due_date ?? ''
    return da.localeCompare(db) || a.title.localeCompare(b.title, 'fr')
  })
  const lines = sorted.map((d) => ({
    label: d.title,
    value: fmt(Number(d.remaining_company_currency), currency),
    meta: `Échéance ${fmtDate(d.due_date)} · ${d.computed_status}`,
    href: `/app/${companyId}/debts/${d.id}`,
  }))
  lines.push({
    label: 'Total dettes ouvertes',
    value: fmt(totalOpenDebt, currency),
    meta: `${debts.length} dette(s)`,
    href: `/app/${companyId}/debts`,
  })
  return {
    title: 'Dettes ouvertes — détail',
    intro: 'Encours non soldés (hors payé / annulé), en devise société.',
    formula: 'Σ remaining_company_currency sur debts_with_remaining pour les statuts ouverts.',
    lines,
  }
}

export function buildDashboardOverdueExplain(
  debts: DebtWithRemaining[],
  currency: string,
  companyId: string
): GroupExplainPayload {
  const lines = debts.map((d) => ({
    label: d.title,
    value: fmt(Number(d.remaining_company_currency), currency),
    meta: `Échéance ${fmtDate(d.due_date)}`,
    href: `/app/${companyId}/debts/${d.id}`,
  }))
  return {
    title: 'Dettes en retard — détail',
    intro: 'Une dette est « en retard » lorsque la date d’échéance est dépassée et le reste dû est positif.',
    formula: 'Liste des lignes avec computed_status = overdue.',
    lines:
      lines.length > 0
        ? lines
        : [{ label: 'Aucune dette en retard', value: '—', meta: undefined, href: `/app/${companyId}/debts` }],
  }
}

export function buildDashboardExpectedRevenueExplain(
  linesData: RevenueMonthLineExpected[],
  totalFromStats: number,
  currency: string,
  companyId: string
): GroupExplainPayload {
  const lines: GroupExplainPayload['lines'] = linesData.map((r) => ({
    label: r.title,
    value: fmt(r.amountExpected, currency),
    meta: `Date prévue ${fmtDate(r.expectedDate)} · déjà reçu ${fmt(r.amountReceived, currency)} · reliquat ${fmt(r.remaining, currency)}`,
    href: `/app/${companyId}/revenues/${r.id}`,
  }))
  if (linesData.length === 0) {
    lines.push({
      label: 'Aucun revenu avec échéance prévue ce mois',
      value: fmt(0, currency),
      meta: undefined,
      href: `/app/${companyId}/revenues`,
    })
  }
  lines.push({
    label: 'Total (revenus attendus ce mois)',
    value: fmt(totalFromStats, currency),
    meta: 'Valeur affichée sur la carte',
    href: `/app/${companyId}/revenues`,
  })
  return {
    title: 'Revenus attendus ce mois — détail',
    intro:
      'Revenus non annulés dont la date d’encaissement prévue tombe dans le mois civil en cours. La carte additionne le montant « attendu » de chaque ligne.',
    formula: 'Pour chaque revenu concerné : prise en compte du montant contractuel attendu (amount_expected) pour le mois.',
    lines,
  }
}

export function buildDashboardReceivedRevenueExplain(
  linesData: RevenueMonthLineReceived[],
  totalFromStats: number,
  currency: string,
  companyId: string
): GroupExplainPayload {
  const lines: GroupExplainPayload['lines'] = linesData.map((r) => ({
    label: r.title,
    value: fmt(r.amountReceived, currency),
    meta: `Date d’encaissement ${fmtDate(r.receivedDate)}`,
    href: `/app/${companyId}/revenues/${r.id}`,
  }))
  if (linesData.length === 0) {
    lines.push({
      label: 'Aucun encaissement enregistré ce mois',
      value: fmt(0, currency),
      meta: undefined,
      href: `/app/${companyId}/revenues`,
    })
  }
  lines.push({
    label: 'Total encaissé sur le mois',
    value: fmt(totalFromStats, currency),
    meta: 'Valeur affichée sur la carte',
    href: `/app/${companyId}/revenues`,
  })
  return {
    title: 'Revenus reçus ce mois — détail',
    intro:
      'Revenus non annulés pour lesquels la date d’encaissement enregistrée tombe dans le mois civil en cours. Le montant pris en compte est le cumul encaissé sur la ligne.',
    formula: 'Somme des amount_received pour les lignes dont received_date est dans le mois courant.',
    lines,
  }
}

export function buildDashboardNetProjectionExplain(
  revenueStats: RevenueStats,
  totalOpenDebt: number,
  netProjection: number,
  currency: string,
  companyId: string
): GroupExplainPayload {
  return {
    title: 'Projection nette — détail',
    intro: 'Indicateur synthétique du tableau de bord (pas la prévision de trésorerie complète).',
    formula: 'Revenus attendus ce mois − total dettes ouvertes.',
    lines: [
      {
        label: 'Revenus attendus ce mois',
        value: fmt(revenueStats.expectedThisMonth, currency),
        meta: undefined,
        href: `/app/${companyId}/revenues`,
      },
      {
        label: 'Dettes ouvertes (total)',
        value: fmt(totalOpenDebt, currency),
        meta: undefined,
        href: `/app/${companyId}/debts`,
      },
      { label: 'Projection nette', value: fmt(netProjection, currency), meta: 'Différence des deux lignes ci-dessus' },
    ],
    footnote: 'Pour le détail mois par mois (trésorerie, matelas, etc.), utilisez la page Prévision.',
  }
}

export function buildDashboardProjectionEndMonthExplain(
  monthLabel: string,
  period: ForecastPeriod | undefined,
  currency: string,
  companyId: string
): GroupExplainPayload {
  if (!period) {
    return {
      title: `Trésorerie fin ${monthLabel}`,
      intro: 'Aucune période de prévision disponible.',
      formula: '—',
      lines: [],
    }
  }
  const forecastHref = `/app/${companyId}/forecast`
  return {
    title: `Trésorerie fin ${monthLabel} — détail`,
    intro: `Moteur generateCompanyForecast · mois « ${period.label} ».`,
    formula: 'Clôture = ouverture + entrées attendues − sorties attendues.',
    lines: [
      { label: 'Ouverture', value: fmt(period.openingCash, currency), meta: undefined, href: forecastHref },
      { label: 'Entrées attendues', value: fmt(period.expectedInflows, currency), meta: undefined, href: forecastHref },
      { label: 'Sorties attendues', value: fmt(period.expectedOutflows, currency), meta: undefined, href: forecastHref },
      { label: 'Flux net', value: fmt(period.netCashFlow, currency), meta: undefined, href: forecastHref },
      {
        label: 'Clôture projetée',
        value: fmt(period.closingCashProjected, currency),
        meta: 'Valeur affichée sur la carte',
        href: forecastHref,
      },
    ],
    footnote: 'Voir la page Prévision pour le détail des revenus et des sorties par ligne.',
  }
}

export function buildDashboardProjectionNextMonthExplain(
  nextMonthLabel: string,
  openingNow: number,
  nextPeriod: ForecastPeriod | undefined,
  isolatedClosing: number | undefined,
  currency: string,
  companyId: string
): GroupExplainPayload {
  if (!nextPeriod || isolatedClosing === undefined) {
    return {
      title: `${nextMonthLabel} — détail`,
      intro: 'Données de prévision insuffisantes pour le mois suivant.',
      formula: '—',
      lines: [],
    }
  }
  const forecastHref = `/app/${companyId}/forecast`
  return {
    title: `${nextMonthLabel} — détail (vue isolée)`,
    intro:
      'À partir de la trésorerie actuelle (sans enchaîner la clôture du mois en cours comme nouvelle ouverture pour ce calcul).',
    formula: 'Trésorerie actuelle + entrées du mois suivant − sorties du mois suivant.',
    lines: [
      {
        label: 'Trésorerie actuelle (point de départ)',
        value: fmt(openingNow, currency),
        meta: 'Ouverture du mois en cours dans la prévision',
        href: forecastHref,
      },
      {
        label: `Entrées — ${nextPeriod.label}`,
        value: fmt(nextPeriod.expectedInflows, currency),
        meta: undefined,
        href: forecastHref,
      },
      {
        label: `Sorties — ${nextPeriod.label}`,
        value: fmt(nextPeriod.expectedOutflows, currency),
        meta: undefined,
        href: forecastHref,
      },
      {
        label: 'Clôture simulée (carte)',
        value: fmt(isolatedClosing, currency),
        meta: 'Ouverture actuelle + entrées − sorties pour ce mois seul',
        href: forecastHref,
      },
    ],
  }
}

function alertEntityHref(a: Alert, companyId: string): string | undefined {
  if (!a.entityId) return undefined
  if (a.entityType === 'debt') return `/app/${companyId}/debts/${a.entityId}`
  if (a.entityType === 'revenue') return `/app/${companyId}/revenues/${a.entityId}`
  if (a.entityType === 'forecast') return `/app/${companyId}/forecast`
  return undefined
}

function alertLines(alerts: Alert[], companyId: string, max = 25): GroupExplainPayload['lines'] {
  const out: GroupExplainPayload['lines'] = alerts.slice(0, max).map((a) => ({
    label: a.title,
    value: '—',
    meta: a.message,
    href: alertEntityHref(a, companyId),
  }))
  if (alerts.length > max) {
    out.push({
      label: `… et ${alerts.length - max} autre(s) alerte(s)`,
      value: '…',
      meta: undefined,
    })
  }
  return out
}

export function buildDashboardAlertsExplain(
  kind: 'critical' | 'warnings' | 'infos',
  count: number,
  allAlerts: Alert[],
  companyId: string
): GroupExplainPayload {
  const severityFilter =
    kind === 'critical' ? 'critical' : kind === 'warnings' ? 'warning' : 'info'
  const filtered = allAlerts.filter((a) => a.severity === severityFilter)
  const titles: Record<typeof kind, string> = {
    critical: 'Alertes critiques — liste',
    warnings: 'Alertes avertissement — liste',
    infos: 'Alertes information — liste',
  }
  return {
    title: titles[kind],
    intro: `${count} alerte(s) de ce niveau. Aperçu des libellés générés par le moteur.`,
    formula: 'Comptage des alertes avec severity correspondante (computeCompanyAlerts).',
    lines: count === 0 ? [{ label: 'Aucune alerte', value: '—', meta: undefined }] : alertLines(filtered, companyId),
    footnote: 'Ouvrez la page Alertes pour agir sur chaque signal.',
  }
}
