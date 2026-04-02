import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageCompany } from '@/lib/auth'
import type { Company } from '@/lib/supabase/types'
import { CompanyTeamView } from '@/modules/companies/components/CompanyTeamView'

export default async function CompanyTeamPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (!companyRow) notFound()
  const company = companyRow as Company

  const [canManage, membershipsRes] = await Promise.all([
    canManageCompany(supabase, companyId),
    supabase
      .from('memberships')
      .select('id, user_id, role, company_id')
      .eq('group_id', company.group_id)
      .or(`company_id.eq.${companyId},company_id.is.null`),
  ])
  if (membershipsRes.error) throw new Error(membershipsRes.error.message)

  const memberships = membershipsRes.data ?? []
  const userIds = Array.from(new Set(memberships.map((m) => m.user_id).filter(Boolean)))
  const { data: profiles, error: profilesErr } = userIds.length
    ? await supabase
        .from('user_profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds)
    : { data: [], error: null }
  if (profilesErr) throw new Error(profilesErr.message)

  const profileByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]))
  const membersMap = new Map<string, {
    user_id: string
    display_name: string
    email: string | null
    role: 'group_admin' | 'company_admin' | 'finance_manager' | 'viewer'
    source: 'group' | 'company'
    companyMembershipId: string | null
  }>()

  for (const m of memberships) {
    const p = profileByUserId.get(m.user_id)
    const base = {
      user_id: m.user_id,
      display_name: p?.display_name ?? p?.email ?? `${m.user_id.slice(0, 8)}…`,
      email: p?.email ?? null,
      role: m.role as 'group_admin' | 'company_admin' | 'finance_manager' | 'viewer',
      source: (m.company_id === null ? 'group' : 'company') as 'group' | 'company',
      companyMembershipId: m.company_id === companyId ? m.id : null,
    }
    const prev = membersMap.get(m.user_id)
    if (!prev) {
      membersMap.set(m.user_id, base)
      continue
    }
    // Prefer explicit company membership over inherited group membership
    if (base.source === 'company') {
      membersMap.set(m.user_id, base)
    }
  }

  const { data: invitations, error: invitationsErr } = await supabase
    .from('company_member_invitations')
    .select('id, email, role, status, expires_at, last_sent_at, sent_count')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (invitationsErr) throw new Error(invitationsErr.message)

  return (
    <CompanyTeamView
      company={company}
      canManage={canManage}
      members={Array.from(membersMap.values())}
      invitations={(invitations ?? []) as Array<{
        id: string
        email: string
        role: 'company_admin' | 'finance_manager' | 'viewer'
        status: 'pending'
        expires_at: string
        last_sent_at: string
        sent_count: number
      }>}
    />
  )
}
