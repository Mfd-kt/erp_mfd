import { createClient } from '@/lib/supabase/server'
import type { Creditor } from '@/lib/supabase/types'

export async function getCreditors(companyId: string): Promise<Creditor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creditors')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Creditor[]
}

export type CreditorDebtTotals = {
  totalAmount: number
  totalPaid: number
  totalRemaining: number
}

/**
 * Agrège les montants des dettes (déjà en **devise société** dans la vue) par créancier,
 * et les totaux **par devise** — ne jamais additionner EUR + TND sans conversion.
 * `companyCurrencyById` : `company_id` → code ISO devise comptable de la société.
 */
export async function getDebtTotalsByCreditorForCompanies(
  companyIds: string[],
  companyCurrencyById: Record<string, string>,
): Promise<{
  byCreditorId: Record<string, CreditorDebtTotals>
  /** Totaux groupe, une entrée par devise (clé = code ISO). */
  totalsByCurrency: Record<string, CreditorDebtTotals>
}> {
  if (companyIds.length === 0) {
    return {
      byCreditorId: {},
      totalsByCurrency: {},
    }
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debts_with_remaining')
    .select(
      'creditor_id, company_id, amount_company_currency, paid_company_currency, remaining_company_currency',
    )
    .in('company_id', companyIds)
  if (error) throw new Error(error.message)

  const byCreditorId: Record<string, CreditorDebtTotals> = {}
  const totalsByCurrency: Record<string, CreditorDebtTotals> = {}

  for (const row of data ?? []) {
    const r = row as {
      creditor_id: string
      company_id: string
      amount_company_currency: number | string
      paid_company_currency: number | string | null
      remaining_company_currency: number | string | null
    }
    const amt = Number(r.amount_company_currency)
    const paid = Number(r.paid_company_currency ?? 0)
    const rem = Number(r.remaining_company_currency ?? 0)
    const cur = byCreditorId[r.creditor_id] ?? { totalAmount: 0, totalPaid: 0, totalRemaining: 0 }
    cur.totalAmount += amt
    cur.totalPaid += paid
    cur.totalRemaining += rem
    byCreditorId[r.creditor_id] = cur

    const ccy = companyCurrencyById[r.company_id] ?? 'EUR'
    const g = totalsByCurrency[ccy] ?? { totalAmount: 0, totalPaid: 0, totalRemaining: 0 }
    g.totalAmount += amt
    g.totalPaid += paid
    g.totalRemaining += rem
    totalsByCurrency[ccy] = g
  }

  return { byCreditorId, totalsByCurrency }
}

/** Créanciers de plusieurs sociétés (vue groupe). */
export async function getCreditorsForCompanies(companyIds: string[]): Promise<Creditor[]> {
  if (companyIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creditors')
    .select('*')
    .in('company_id', companyIds)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Creditor[]
}

export async function getCreditorById(companyId: string, creditorId: string): Promise<Creditor | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creditors')
    .select('*')
    .eq('id', creditorId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as Creditor
}
