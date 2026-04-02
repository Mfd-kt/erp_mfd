import { createClient } from '@/lib/supabase/server'
import type { Revenue } from '@/lib/supabase/types'
import type { RevenueStatus } from '@/lib/supabase/types'
import type { RevenueClient } from '@/lib/supabase/types'

export type RevenueRow = Revenue & {
  computed_status: RevenueStatus
  accounts?: { name: string } | null
  account?: { name: string } | null
  revenue_clients?: { name: string } | null
}

export interface RevenueFilters {
  status?: string
  expected_date_from?: string
  expected_date_to?: string
  source_name?: string
  client_id?: string
  revenue_category?: string
}

function getComputedStatus(r: Revenue): RevenueStatus {
  const received = Number(r.amount_received) || 0
  const expected = Number(r.amount_expected) || 0
  if (received >= expected && expected > 0 && r.received_date && r.account_id) return 'received'
  if (received > 0) return 'partial'
  if (r.status === 'cancelled') return 'cancelled'
  return 'expected'
}

function isRevenueClientSchemaError(message: string) {
  return (
    message.includes("relationship between 'revenues' and 'revenue_clients'") ||
    message.includes('revenue_clients') ||
    message.includes('client_id') ||
    message.includes('revenue_category')
  )
}

function parseLegacyRevenueCategory(notes: string | null | undefined) {
  if (!notes) return 'other' as const
  const m = notes.match(/\[rev_category:(client|goods_sale|other)\]/)
  return (m?.[1] as 'client' | 'goods_sale' | 'other' | undefined) ?? 'other'
}

function stripLegacyCategoryMarker(notes: string | null | undefined) {
  if (!notes) return null
  const cleaned = notes.replace(/\s*\[rev_category:(client|goods_sale|other)\]\s*/g, '').trim()
  return cleaned || null
}

function toRevenueRow(r: Revenue & { accounts?: { name: string } | null; revenue_clients?: { name: string } | null }) {
  const raw = r as Revenue
  const fallbackCategory = parseLegacyRevenueCategory(raw.notes)
  return {
    ...r,
    client_id: raw.client_id ?? null,
    revenue_category: raw.revenue_category ?? fallbackCategory,
    notes: stripLegacyCategoryMarker(raw.notes),
    computed_status: getComputedStatus(r),
    accounts: (r as unknown as { accounts?: { name: string } | null }).accounts,
    revenue_clients: (r as unknown as { revenue_clients?: { name: string } | null }).revenue_clients ?? null,
  } as RevenueRow
}

export async function getRevenues(
  companyId: string,
  filters?: RevenueFilters
): Promise<RevenueRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('revenues')
    .select('*, accounts(name), revenue_clients(name)')
    .eq('company_id', companyId)
    .order('expected_date', { ascending: false })

  if (filters?.expected_date_from) query = query.gte('expected_date', filters.expected_date_from)
  if (filters?.expected_date_to) query = query.lte('expected_date', filters.expected_date_to)
  if (filters?.source_name) query = query.ilike('source_name', `%${filters.source_name}%`)
  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.revenue_category) query = query.eq('revenue_category', filters.revenue_category)

  let { data, error } = await query
  if (error && isRevenueClientSchemaError(error.message)) {
    const fallback = await supabase
      .from('revenues')
      .select('*, accounts(name)')
      .eq('company_id', companyId)
      .order('expected_date', { ascending: false })
    data = fallback.data
    error = fallback.error
  }
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Revenue[]
  const withStatus = rows.map((r) => toRevenueRow(r as Revenue & { accounts?: { name: string } | null }))
  if (filters?.status) {
    return withStatus.filter((r) => r.computed_status === filters.status) as RevenueRow[]
  }
  return withStatus as RevenueRow[]
}

/** Revenus avec encaissement sur ce compte (entrées). */
export async function getRevenueInflowsForAccount(companyId: string, accountId: string): Promise<RevenueRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('revenues')
    .select('*, accounts(name), revenue_clients(name)')
    .eq('company_id', companyId)
    .eq('account_id', accountId)
    .gt('amount_received', 0)
    .order('received_date', { ascending: false, nullsFirst: false })
  let rowsData = data
  let rowsError = error
  if (rowsError && isRevenueClientSchemaError(rowsError.message)) {
    const fallback = await supabase
      .from('revenues')
      .select('*, accounts(name)')
      .eq('company_id', companyId)
      .eq('account_id', accountId)
      .gt('amount_received', 0)
      .order('received_date', { ascending: false, nullsFirst: false })
    rowsData = fallback.data
    rowsError = fallback.error
  }
  if (rowsError) throw new Error(rowsError.message)
  const rows = (rowsData ?? []) as Revenue[]
  return rows.map((r) => toRevenueRow(r as Revenue & { accounts?: { name: string } | null })) as RevenueRow[]
}

/** Revenus encore à encaisser (montant restant > 0). */
export async function getReceivableRevenues(companyId: string): Promise<RevenueRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('revenues')
    .select('*, accounts(name), revenue_clients(name)')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .order('expected_date', { ascending: true })
  let rowsData = data
  let rowsError = error
  if (rowsError && isRevenueClientSchemaError(rowsError.message)) {
    const fallback = await supabase
      .from('revenues')
      .select('*, accounts(name)')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .order('expected_date', { ascending: true })
    rowsData = fallback.data
    rowsError = fallback.error
  }
  if (rowsError) throw new Error(rowsError.message)
  const rows = (rowsData ?? []) as Revenue[]
  const withStatus = rows.map((r) =>
    toRevenueRow(r as Revenue & { accounts?: { name: string } | null })
  ) as RevenueRow[]
  return withStatus.filter((r) => {
    const exp = Number(r.amount_expected) || 0
    const rec = Number(r.amount_received) || 0
    return exp - rec > 0.0001
  })
}

export async function getRevenueById(
  companyId: string,
  revenueId: string
): Promise<RevenueRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('revenues')
    .select('*, accounts(name), revenue_clients(name)')
    .eq('id', revenueId)
    .eq('company_id', companyId)
    .single()
  let rowData = data
  let rowError = error
  if (rowError && isRevenueClientSchemaError(rowError.message)) {
    const fallback = await supabase
      .from('revenues')
      .select('*, accounts(name)')
      .eq('id', revenueId)
      .eq('company_id', companyId)
      .single()
    rowData = fallback.data
    rowError = fallback.error
  }
  if (rowError || !rowData) return null
  const r = rowData as Revenue & {
    accounts?: { name: string } | null
    revenue_clients?: { name: string } | null
  }
  return toRevenueRow(r)
}

export async function getRevenueClients(companyId: string): Promise<RevenueClient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('revenue_clients')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })
  if (error) {
    if (isRevenueClientSchemaError(error.message)) {
      // Legacy fallback: build pseudo-clients from revenue source_name.
      const { data: legacyRows, error: legacyError } = await supabase
        .from('revenues')
        .select('source_name')
        .eq('company_id', companyId)
      if (legacyError) throw new Error(legacyError.message)
      const names = Array.from(
        new Set(
          (legacyRows ?? [])
            .map((r) => (r as { source_name?: string | null }).source_name?.trim())
            .filter((v): v is string => Boolean(v))
        )
      ).sort((a, b) => a.localeCompare(b, 'fr'))
      return names.map((name) => ({
        id: `legacy:${name.toLowerCase()}`,
        company_id: companyId,
        name,
        notes: null,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      }))
    }
    throw new Error(error.message)
  }
  return (data ?? []) as RevenueClient[]
}

export interface RevenueStats {
  totalExpected: number
  totalReceived: number
  expectedThisMonth: number
  receivedThisMonth: number
}

export interface RevenueMonthLineExpected {
  id: string
  title: string
  expectedDate: string
  amountExpected: number
  amountReceived: number
  remaining: number
}

export interface RevenueMonthLineReceived {
  id: string
  title: string
  receivedDate: string
  amountReceived: number
}

/**
 * Lignes détaillées pour le mois civil en cours (même logique que getRevenueStats), hors annulés.
 */
export async function getRevenueMonthBreakdowns(companyId: string): Promise<{
  expectedLines: RevenueMonthLineExpected[]
  receivedLines: RevenueMonthLineReceived[]
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('revenues')
    .select('id, title, amount_expected, amount_received, expected_date, received_date')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
  if (error) throw new Error(error.message)
  const list = (data ?? []) as Pick<
    Revenue,
    'id' | 'title' | 'amount_expected' | 'amount_received' | 'expected_date' | 'received_date'
  >[]
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const expectedLines: RevenueMonthLineExpected[] = []
  const receivedLines: RevenueMonthLineReceived[] = []
  for (const r of list) {
    const exp = Number(r.amount_expected) || 0
    const rec = Number(r.amount_received) || 0
    const remaining = Math.max(0, exp - rec)
    if (r.expected_date) {
      const d = new Date(r.expected_date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        expectedLines.push({
          id: r.id,
          title: r.title,
          expectedDate: r.expected_date,
          amountExpected: exp,
          amountReceived: rec,
          remaining,
        })
      }
    }
    if (r.received_date) {
      const d = new Date(r.received_date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        receivedLines.push({
          id: r.id,
          title: r.title,
          receivedDate: r.received_date,
          amountReceived: rec,
        })
      }
    }
  }
  expectedLines.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.title.localeCompare(b.title, 'fr'))
  receivedLines.sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) || a.title.localeCompare(b.title, 'fr'))
  return { expectedLines, receivedLines }
}

export async function getRevenueStats(
  companyId: string,
  defaultCurrency: string
): Promise<RevenueStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('revenues')
    .select('amount_expected, amount_received, expected_date, received_date, currency_code')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
  if (error) throw new Error(error.message)
  const list = (data ?? []) as Pick<Revenue, 'amount_expected' | 'amount_received' | 'expected_date' | 'received_date' | 'currency_code'>[]
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  let totalExpected = 0
  let totalReceived = 0
  let expectedThisMonth = 0
  let receivedThisMonth = 0
  for (const r of list) {
    const exp = Number(r.amount_expected) || 0
    const rec = Number(r.amount_received) || 0
    totalExpected += exp
    totalReceived += rec
    if (r.expected_date) {
      const d = new Date(r.expected_date)
      if (d.getFullYear() === year && d.getMonth() === month) expectedThisMonth += exp
    }
    if (r.received_date) {
      const d = new Date(r.received_date)
      if (d.getFullYear() === year && d.getMonth() === month) receivedThisMonth += rec
    }
  }
  return {
    totalExpected,
    totalReceived,
    expectedThisMonth,
    receivedThisMonth,
  }
}
