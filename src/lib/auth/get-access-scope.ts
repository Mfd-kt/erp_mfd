import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesByGroup } from '@/modules/companies/queries'
import type { Company, Group, MembershipRole } from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'

export type AccessScope = {
  user: User
  userId: string
  role: MembershipRole
  group: Group | null
  companies: Company[]
  isGroupAdmin: boolean
}

const ROLE_RANK: Record<MembershipRole, number> = {
  viewer: 1,
  finance_manager: 2,
  company_admin: 3,
  group_admin: 4,
}

/**
 * Returns the access scope for the current user: companies they can see and group context.
 * - group_admin (membership with company_id = null): all companies of the group via getCompaniesByGroup(group_id).
 * - Otherwise: companies from memberships (join), deduplicated by company.id.
 * Use this in layout, dashboard groupe, and any page that needs "visible companies" or group.
 * Dédupliqué par requête RSC (layout + page) via React cache.
 */
export const getAccessScope = cache(async function getAccessScope(): Promise<AccessScope | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberships } = await supabase
    .from('memberships')
    .select('*, groups(*), companies(*)')
    .eq('user_id', user.id)

  const groupAdminMembership = memberships?.find((m) => m.company_id === null)

  let companies: Company[]
  let group: Group | null = null
  let role: MembershipRole = 'viewer'

  if (groupAdminMembership?.group_id) {
    // Group admin sees every company in the group, even without company-level rows.
    companies = await getCompaniesByGroup(groupAdminMembership.group_id)
    group = (groupAdminMembership as { groups?: Group | null }).groups ?? null
    role = 'group_admin'
  } else {
    // Non group-admin users are limited to explicitly attached companies.
    const companiesRaw = (memberships ?? [])
      .filter((m): m is typeof m & { companies: Company } => Boolean(m.companies))
      .map((m) => m.companies)
    companies = Array.from(new Map(companiesRaw.map((c) => [c.id, c])).values())
    const first = memberships?.[0] as { groups?: Group | null; role?: MembershipRole } | undefined
    const highestRole = (memberships ?? []).reduce<MembershipRole>((acc, m) => {
      const roleCandidate = ((m as { role?: MembershipRole }).role ?? 'viewer') as MembershipRole
      return ROLE_RANK[roleCandidate] > ROLE_RANK[acc] ? roleCandidate : acc
    }, 'viewer')
    group = first?.groups ?? null
    role = highestRole
  }

  return {
    user,
    userId: user.id,
    role,
    group,
    companies,
    isGroupAdmin: !!groupAdminMembership,
  }
})
