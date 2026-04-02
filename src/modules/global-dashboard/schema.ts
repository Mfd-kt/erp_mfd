import type { GlobalPeriod, GlobalScope } from './types'

export function parseGlobalSearchParams(searchParams: Record<string, string | string[] | undefined>): {
  period: GlobalPeriod
  scope: GlobalScope
} {
  const periodRaw = searchParams.period
  const periodNum = typeof periodRaw === 'string' ? parseInt(periodRaw, 10) : 30
  const period: GlobalPeriod = [30, 60, 90].includes(periodNum) ? (periodNum as GlobalPeriod) : 30

  const scopeRaw = searchParams.scope
  const scope: GlobalScope =
    scopeRaw === 'business' || scopeRaw === 'personal' ? scopeRaw : 'all'

  return { period, scope }
}
