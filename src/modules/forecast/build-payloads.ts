import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { CompanyForecast, ForecastPeriod, GroupForecast, GroupForecastPeriod, GroupCompanyPeriodContribution } from './types'
import { sumFollowingSixMonthsOutflows } from './cushion'

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function buildPeriodExplain(
  title: string,
  period: GroupForecastPeriod,
  baseCurrency: string,
  companiesIncluded: number,
  incomplete?: boolean,
  missingExchangeRates?: string[]
): GroupExplainPayload {
  const footParts: string[] = []
  if (incomplete && missingExchangeRates && missingExchangeRates.length > 0) {
    footParts.push(
      `Taux manquants : ${missingExchangeRates.join(' · ')} — les sociétés non converties sont exclues des totaux.`
    )
  }

  const lines: GroupExplainPayload['lines'] = [
    { label: 'Ouverture consolidée', value: fmt(period.openingCash, baseCurrency), meta: 'Somme des trésoreries d’ouverture converties' },
    { label: 'Entrées attendues', value: fmt(period.expectedInflows, baseCurrency), meta: 'Revenus restant à encaisser sur le mois' },
    { label: 'Sorties attendues', value: fmt(period.expectedOutflows, baseCurrency), meta: 'Dettes à payer + récurrents simulés sur le mois' },
    { label: 'Flux net', value: fmt(period.netCashFlow, baseCurrency), meta: 'Entrées − sorties' },
    { label: 'Clôture projetée', value: fmt(period.closingCashProjected, baseCurrency), meta: 'Ouverture + flux net' },
  ]

  const by = period.byCompany
  if (by && by.length > 0) {
    lines.push({ label: 'Par société (clôture en devise du groupe)', value: '', meta: undefined })
    for (const row of by) {
      const r = row as GroupCompanyPeriodContribution
      if (r.included === false) {
        lines.push({
          label: r.companyName,
          value: '—',
          meta: `Exclue — taux ${r.currency} → ${baseCurrency} manquant`,
        })
      } else {
        lines.push({
          label: r.companyName,
          value: fmt(r.closingCashProjected, baseCurrency),
          meta: `Devise d’origine : ${r.currency}`,
        })
      }
    }
  } else if (incomplete) {
    lines.push({
      label: '—',
      value: 'Aucune société consolidée pour ce mois',
      meta: 'Vérifier les taux de change',
    })
  }

  return {
    title,
    intro: `Prévision groupe : ${companiesIncluded} entité(s) · consolidation en ${baseCurrency}. Les montants sont convertis avec le dernier taux enregistré dont la date d’effet ≤ fin du mois concerné.`,
    formula:
      'Pour chaque société : prévision mois par mois (soldes comptes, revenus attendus, dettes et récurrents). Puis conversion de chaque ligne vers ' +
      baseCurrency +
      ' et agrégation des flux.',
    lines,
    footnote: footParts.length > 0 ? footParts.join(' ') : undefined,
  }
}

export interface GroupForecastSummaryExplains {
  currentMonth: GroupExplainPayload
  nextMonth: GroupExplainPayload | null
  endOfHorizon: GroupExplainPayload | null
  /** Matelas = Σ sorties des mois suivant le mois en cours (ligne 0). */
  cushionAfterCurrentMonth: GroupExplainPayload | null
  /** Hors matelas = clôture mois en cours − matelas. */
  horsMatelasAfterCurrentMonth: GroupExplainPayload | null
}

export function buildGroupForecastSummaryExplains(forecast: GroupForecast): GroupForecastSummaryExplains {
  const periods = forecast.periods
  const base = forecast.baseCurrency
  const n = forecast.companiesIncluded
  const inc = forecast.incomplete
  const miss = forecast.missingExchangeRates

  if (periods.length === 0) {
    const empty: GroupExplainPayload = {
      title: 'Prévision groupe',
      intro: 'Aucune période calculée.',
      formula: '—',
      lines: [],
    }
    return {
      currentMonth: empty,
      nextMonth: null,
      endOfHorizon: null,
      cushionAfterCurrentMonth: null,
      horsMatelasAfterCurrentMonth: null,
    }
  }

  const current = periods[0] as GroupForecastPeriod
  const next = periods.length > 1 ? (periods[1] as GroupForecastPeriod) : null
  const last = periods[periods.length - 1] as GroupForecastPeriod

  return {
    currentMonth: buildPeriodExplain(
      `Fin du mois en cours — ${current.label}`,
      current,
      base,
      n,
      inc,
      miss
    ),
    nextMonth: next
      ? buildPeriodExplain(`Mois prochain — ${next.label}`, next, base, n, inc, miss)
      : null,
    endOfHorizon:
      last && last !== current
        ? buildPeriodExplain(`Fin de période — ${last.label}`, last, base, n, inc, miss)
        : null,
    cushionAfterCurrentMonth: buildCushionExplain(periods as ForecastPeriod[], 0, base, 'consolidation groupe'),
    horsMatelasAfterCurrentMonth: buildHorsMatelasExplain(
      current as ForecastPeriod,
      periods as ForecastPeriod[],
      0,
      base,
      'consolidation groupe'
    ),
  }
}

function buildCompanyPeriodExplain(
  title: string,
  period: ForecastPeriod,
  currency: string,
  companyName: string
): GroupExplainPayload {
  return {
    title,
    intro: `Prévision pour ${companyName} · montants en ${currency} (pas de conversion multi-devises).`,
    formula:
      'Ouverture = somme des soldes comptes actifs ; entrées = revenus (reliquat attendu) sur le mois ; sorties = dettes à échéance dans le mois + sorties récurrentes simulées ; clôture = ouverture + entrées − sorties.',
    lines: [
      { label: 'Ouverture', value: fmt(period.openingCash, currency), meta: 'Trésorerie en début de mois' },
      { label: 'Entrées attendues', value: fmt(period.expectedInflows, currency), meta: undefined },
      { label: 'Sorties attendues', value: fmt(period.expectedOutflows, currency), meta: undefined },
      { label: 'Flux net', value: fmt(period.netCashFlow, currency), meta: undefined },
      { label: 'Clôture projetée', value: fmt(period.closingCashProjected, currency), meta: undefined },
    ],
  }
}

function buildCushionExplain(
  periods: ForecastPeriod[],
  rowIndex: number,
  currency: string,
  scopeLabel: string
): GroupExplainPayload | null {
  if (periods.length === 0) return null
  const row = periods[rowIndex]
  if (!row) return null
  const detail = sumFollowingSixMonthsOutflows(periods, rowIndex)
  if (detail.monthsCounted === 0) {
    return {
      title: `Matelas 6 mois — ${row.label}`,
      intro: `Prévision (${scopeLabel}). Aucun mois suivant dans la grille : le matelas ne peut pas être calculé.`,
      formula: '—',
      lines: [],
    }
  }
  const lines: GroupExplainPayload['lines'] = []
  for (let j = 1; j <= 6 && rowIndex + j < periods.length; j++) {
    const p = periods[rowIndex + j]!
    lines.push({
      label: `Sorties ${p.label}`,
      value: fmt(p.expectedOutflows, currency),
      meta: 'Inclus dans le matelas',
    })
  }
  lines.push({
    label: 'Total matelas',
    value: fmt(detail.sum, currency),
    meta:
      detail.monthsCounted < 6
        ? `Somme sur ${detail.monthsCounted} mois (horizon tronqué)`
        : 'Somme sur 6 mois',
  })
  return {
    title: `Matelas à réserver — après ${row.label}`,
    intro: `Montant des sorties prévues sur les mois suivant ${row.label} (${scopeLabel}). À comparer à la trésorerie de clôture de ${row.label} pour le hors matelas.`,
    formula: 'Σ des sorties attendues sur les six mois calendaires suivant la ligne (ou moins si la prévision s’arrête avant).',
    lines,
    footnote:
      detail.monthsCounted < 6
        ? `Seulement ${detail.monthsCounted} mois disponibles après ${row.label} dans cette prévision.`
        : undefined,
  }
}

function buildHorsMatelasExplain(
  period: ForecastPeriod,
  periods: ForecastPeriod[],
  rowIndex: number,
  currency: string,
  scopeLabel: string
): GroupExplainPayload | null {
  if (periods.length === 0) return null
  const detail = sumFollowingSixMonthsOutflows(periods, rowIndex)
  const closing = period.closingCashProjected
  const matelas = detail.monthsCounted === 0 ? 0 : detail.sum
  const hors = detail.monthsCounted === 0 ? closing : closing - matelas
  return {
    title: `Trésorerie hors matelas — ${period.label}`,
    intro: `Prévision (${scopeLabel}). Trésorerie disponible une fois « réservé » le besoin des sorties des mois suivants (matelas).`,
    formula:
      detail.monthsCounted === 0
        ? 'Hors matelas = clôture projetée (aucun matelas à soustraire).'
        : 'Hors matelas = clôture projetée − matelas.',
    lines: [
      { label: 'Clôture projetée', value: fmt(closing, currency), meta: undefined },
      ...(detail.monthsCounted > 0
        ? [
            {
              label: 'Matelas (sorties des mois suivants)',
              value: fmt(matelas, currency),
              meta: undefined,
            } as const,
          ]
        : [{ label: 'Matelas', value: '—', meta: 'Pas de mois suivant dans la prévision' }]),
      { label: 'Hors matelas', value: fmt(hors, currency), meta: 'Ce qui reste après réservation' },
    ],
  }
}

/** Popups pour la prévision d’une seule société (même structure que le groupe). */
export function buildCompanyForecastSummaryExplains(
  forecast: CompanyForecast,
  companyName: string
): GroupForecastSummaryExplains {
  const periods = forecast.periods
  const ccy = forecast.currency

  if (periods.length === 0) {
    const empty: GroupExplainPayload = {
      title: 'Prévision',
      intro: 'Aucune période calculée.',
      formula: '—',
      lines: [],
    }
    return {
      currentMonth: empty,
      nextMonth: null,
      endOfHorizon: null,
      cushionAfterCurrentMonth: null,
      horsMatelasAfterCurrentMonth: null,
    }
  }

  const current = periods[0]!
  const next = periods.length > 1 ? periods[1] : null
  const last = periods[periods.length - 1]!

  return {
    currentMonth: buildCompanyPeriodExplain(`Fin du mois en cours — ${current.label}`, current, ccy, companyName),
    nextMonth: next ? buildCompanyPeriodExplain(`Mois prochain — ${next.label}`, next, ccy, companyName) : null,
    endOfHorizon:
      last && last !== current
        ? buildCompanyPeriodExplain(`Fin de période — ${last.label}`, last, ccy, companyName)
        : null,
    cushionAfterCurrentMonth: buildCushionExplain(periods, 0, ccy, companyName),
    horsMatelasAfterCurrentMonth: buildHorsMatelasExplain(current, periods, 0, ccy, companyName),
  }
}
