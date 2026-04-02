import type { SupabaseClient } from '@supabase/supabase-js'

const MANAGER_ROLES = ['group_admin', 'company_admin', 'finance_manager'] as const

/**
 * Asserts the current user can manage data for the given company.
 * group_admin (company_id null) or company_admin/finance_manager for that company.
 */
export async function assertCanManageCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .in('role', MANAGER_ROLES)
    .limit(1)
    .maybeSingle()

  if (!data) throw new Error('Accès interdit')
}

/**
 * Asserts the current user is a group_admin (membership with company_id null and role group_admin).
 */
export async function assertGroupAdmin(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { data } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .is('company_id', null)
    .eq('role', 'group_admin')
    .limit(1)
    .maybeSingle()

  if (!data) throw new Error('Accès interdit')
}

/**
 * Returns whether the current user can manage (create/edit/delete) for the given company.
 * Used by Server Components to show/hide action buttons.
 */
export async function canManageCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<boolean> {
  try {
    await assertCanManageCompany(supabase, companyId)
    return true
  } catch {
    return false
  }
}

/**
 * Returns whether the current user is a group admin.
 */
export async function isGroupAdmin(supabase: SupabaseClient): Promise<boolean> {
  try {
    await assertGroupAdmin(supabase)
    return true
  } catch {
    return false
  }
}

const GROUP_EXCHANGE_MANAGER_ROLES = ['group_admin', 'company_admin', 'finance_manager'] as const

/**
 * Gestion des taux de change (table exchange_rates, périmètre groupe).
 */
export async function assertCanManageGroupExchangeRates(supabase: SupabaseClient, groupId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { data } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .in('role', [...GROUP_EXCHANGE_MANAGER_ROLES])
    .limit(1)
    .maybeSingle()

  if (!data) throw new Error('Accès interdit : droits requis pour modifier les taux de change.')
}

export async function canManageGroupExchangeRates(supabase: SupabaseClient, groupId: string): Promise<boolean> {
  try {
    await assertCanManageGroupExchangeRates(supabase, groupId)
    return true
  } catch {
    return false
  }
}
