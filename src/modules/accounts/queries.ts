import { createClient } from '@/lib/supabase/server'
import type { Account, AccountWithBalance } from '@/lib/supabase/types'

export async function getAccounts(companyId: string): Promise<AccountWithBalance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts_with_balance')
    .select('*')
    .eq('company_id', companyId)
    .order('is_active', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AccountWithBalance[]
}

export async function getAccountWithBalanceById(companyId: string, accountId: string): Promise<AccountWithBalance | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts_with_balance')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', accountId)
    .maybeSingle()
  if (error || !data) return null
  return data as AccountWithBalance
}

export async function getAccountById(companyId: string, accountId: string): Promise<Account | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('company_id', companyId)
    .single()
  if (error || !data) return null
  return data as Account
}
