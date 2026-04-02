import type { Company } from '@/lib/supabase/types'
import { getExchangeRateStrict } from '@/modules/forecast/queries'

type DebtRow = {
  id: string
  company_id: string
  title: string
  remaining_company_currency: number
  computed_status: string
  priority: string
}

export type DebtFxBreakdown = {
  /** Somme des montants convertis en devise du groupe (taux manquant → exclu du total). */
  totalInBase: number
  hasMissingRate: boolean
  asOfDate: string
  baseCurrency: string
  byCompany: Array<{
    companyId: string
    label: string
    currency: string
    totalLocal: number
    totalInBase: number | null
    rate: number | null
    rateMissing: boolean
  }>
  debtLines: Array<{
    id: string
    title: string
    companyLabel: string
    currency: string
    local: number
    inBase: number | null
    rate: number | null
    rateMissing: boolean
  }>
}

function companyLabel(c: Company) {
  return c.trade_name ?? c.legal_name
}

/**
 * Convertit les restants dus (devise société) vers la devise du groupe avec les taux `exchange_rates`
 * (même logique que la prévision : dernier taux avec date ≤ asOfDate).
 */
export async function computeDebtFxBreakdown(
  debtRows: DebtRow[],
  companies: Company[],
  baseCurrency: string,
  filter: (d: DebtRow) => boolean,
  asOfDate: string
): Promise<DebtFxBreakdown> {
  const cmap = new Map(companies.map((c) => [c.id, c]))
  const filtered = debtRows.filter(filter)

  const byCompany = new Map<string, number>()
  for (const d of filtered) {
    const v = Number(d.remaining_company_currency)
    byCompany.set(d.company_id, (byCompany.get(d.company_id) ?? 0) + v)
  }

  const currenciesNeeded = new Set<string>()
  for (const cid of byCompany.keys()) {
    const c = cmap.get(cid)
    currenciesNeeded.add(c?.default_currency ?? 'EUR')
  }

  const rateByCurrency = new Map<string, { rate: number; missing: boolean }>()

  await Promise.all(
    [...currenciesNeeded].map(async (from) => {
      if (from === baseCurrency) {
        rateByCurrency.set(from, { rate: 1, missing: false })
        return
      }
      const r = await getExchangeRateStrict(from, baseCurrency, asOfDate)
      if (r.missing || r.rate == null) {
        rateByCurrency.set(from, { rate: 0, missing: true })
      } else {
        rateByCurrency.set(from, { rate: r.rate, missing: false })
      }
    })
  )

  let totalInBase = 0
  let hasMissingRate = false

  const byCompanyRows: DebtFxBreakdown['byCompany'] = []
  for (const [cid, sumLocal] of byCompany) {
    const c = cmap.get(cid)
    const label = c ? companyLabel(c) : cid
    const currency = c?.default_currency ?? 'EUR'
    const fx = rateByCurrency.get(currency) ?? { rate: 0, missing: true }
    if (fx.missing) {
      hasMissingRate = true
      byCompanyRows.push({
        companyId: cid,
        label,
        currency,
        totalLocal: sumLocal,
        totalInBase: null,
        rate: null,
        rateMissing: true,
      })
    } else {
      const inBase = sumLocal * fx.rate
      totalInBase += inBase
      byCompanyRows.push({
        companyId: cid,
        label,
        currency,
        totalLocal: sumLocal,
        totalInBase: inBase,
        rate: fx.rate,
        rateMissing: false,
      })
    }
  }

  const debtLines: DebtFxBreakdown['debtLines'] = []
  for (const d of filtered) {
    const c = cmap.get(d.company_id)
    const currency = c?.default_currency ?? 'EUR'
    const fx = rateByCurrency.get(currency) ?? { rate: 0, missing: true }
    const local = Number(d.remaining_company_currency)
    if (fx.missing) {
      hasMissingRate = true
      debtLines.push({
        id: d.id,
        title: d.title,
        companyLabel: c ? companyLabel(c) : d.company_id,
        currency,
        local,
        inBase: null,
        rate: null,
        rateMissing: true,
      })
    } else {
      debtLines.push({
        id: d.id,
        title: d.title,
        companyLabel: c ? companyLabel(c) : d.company_id,
        currency,
        local,
        inBase: local * fx.rate,
        rate: fx.rate,
        rateMissing: false,
      })
    }
  }

  return {
    totalInBase,
    hasMissingRate,
    asOfDate,
    baseCurrency,
    byCompany: byCompanyRows,
    debtLines,
  }
}
