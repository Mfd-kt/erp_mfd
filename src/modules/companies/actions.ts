'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertGroupAdmin } from '@/lib/auth'
import { companySchema, updateCompanySchema } from './schema'
import { z } from 'zod'

const getClient = async () => (await createClient()) as any
const getService = () => createServiceClient() as any


export async function createCompany(groupId: string, formData: unknown) {
  const supabase = await getClient()
  await assertGroupAdmin(supabase)
  const parsed = companySchema.parse(formData)
  const { type, ...rest } = parsed
  const payload = { ...rest, group_id: groupId, type: type ?? 'business' }
  const { error } = await supabase.from('companies').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/app/settings/companies')
  revalidatePath('/app')
}

export async function updateCompany(groupId: string, formData: unknown) {
  const supabase = await getClient()
  await assertGroupAdmin(supabase)
  const parsed = updateCompanySchema.parse(formData)
  const { id, ...rest } = parsed
  const { error } = await supabase
    .from('companies')
    .update(rest)
    .eq('id', id)
    .eq('group_id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/app/settings/companies')
  revalidatePath('/app')
}

export async function deleteCompany(groupId: string, companyId: string) {
  const supabase = await getClient()
  await assertGroupAdmin(supabase)
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)
    .eq('group_id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/app/settings/companies')
  revalidatePath('/app')
}

const addCompanyMemberSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email('Email invalide'),
  role: z.enum(['company_admin', 'finance_manager', 'viewer']),
})

const createCompanyMemberAccountSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe: 8 caractères minimum'),
  role: z.enum(['company_admin', 'finance_manager', 'viewer']),
  displayName: z.string().trim().min(2, 'Nom affiché trop court').max(120).optional(),
})

export async function addCompanyMember(input: unknown) {
  const parsed = addCompanyMemberSchema.parse(input)
  const supabase = await getClient()
  await assertGroupAdmin(supabase)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, group_id')
    .eq('id', parsed.companyId)
    .single()
  if (companyError || !company) throw new Error('Entreprise introuvable.')

  const normalizedEmail = parsed.email.trim().toLowerCase()
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)
  if (!profile?.user_id) {
    throw new Error("Utilisateur introuvable. Il doit se connecter au moins une fois avec cet email.")
  }

  const { data: existing, error: existingError } = await supabase
    .from('memberships')
    .select('id')
    .eq('group_id', company.group_id)
    .eq('company_id', company.id)
    .eq('user_id', profile.user_id)
    .limit(1)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing?.id) throw new Error('Ce membre est déjà dans cette entreprise.')

  const { error: insertError } = await supabase.from('memberships').insert({
    user_id: profile.user_id,
    group_id: company.group_id,
    company_id: company.id,
    role: parsed.role,
  })
  if (insertError) throw new Error(insertError.message)

  revalidatePath('/app')
  revalidatePath('/app/settings/companies')
  revalidatePath(`/app/${company.id}/team`)
}

export async function createCompanyMemberAccount(input: unknown) {
  const parsed = createCompanyMemberAccountSchema.parse(input)
  const supabase = await getClient()
  const service = getService()
  await assertGroupAdmin(supabase)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, group_id')
    .eq('id', parsed.companyId)
    .single()
  if (companyError || !company) throw new Error('Entreprise introuvable.')

  const normalizedEmail = parsed.email.trim().toLowerCase()
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .ilike('email', normalizedEmail)
    .maybeSingle()
  if (existingProfileError) throw new Error(existingProfileError.message)
  if (existingProfile?.user_id) {
    throw new Error('Un compte existe déjà avec cet email. Utilise "Ajouter" ou "Invitation".')
  }

  const created = await service.auth.admin.createUser({
    email: normalizedEmail,
    password: parsed.password,
    email_confirm: true,
    user_metadata: parsed.displayName ? { display_name: parsed.displayName.trim() } : undefined,
  })
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? 'Impossible de créer le compte utilisateur.')
  }

  const newUserId = created.data.user.id

  try {
    // Sécurise le profil si le trigger auth->public n'est pas encore appliqué.
    await service.from('user_profiles').upsert(
      {
        user_id: newUserId,
        email: normalizedEmail,
        display_name: parsed.displayName?.trim() || null,
      },
      { onConflict: 'user_id' }
    )

    const { error: insertMembershipError } = await service.from('memberships').insert({
      user_id: newUserId,
      group_id: company.group_id,
      company_id: company.id,
      role: parsed.role,
    })
    if (insertMembershipError) throw new Error(insertMembershipError.message)
  } catch (error) {
    await service.auth.admin.deleteUser(newUserId).catch(() => undefined)
    throw error
  }

  revalidatePath('/app')
  revalidatePath('/app/settings/companies')
  revalidatePath(`/app/${company.id}/team`)
}

const updateCompanyMemberRoleSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['company_admin', 'finance_manager', 'viewer']),
})

export async function updateCompanyMemberRole(input: unknown) {
  const parsed = updateCompanyMemberRoleSchema.parse(input)
  const supabase = await getClient()
  await assertGroupAdmin(supabase)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, group_id')
    .eq('id', parsed.companyId)
    .single()
  if (companyError || !company) throw new Error('Entreprise introuvable.')

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id')
    .eq('group_id', company.group_id)
    .eq('company_id', company.id)
    .eq('user_id', parsed.userId)
    .maybeSingle()
  if (membershipError) throw new Error(membershipError.message)
  if (!membership?.id) throw new Error("Membre hérité du groupe: rôle non modifiable ici.")

  const { error } = await supabase
    .from('memberships')
    .update({ role: parsed.role })
    .eq('id', membership.id)
  if (error) throw new Error(error.message)

  revalidatePath('/app')
  revalidatePath(`/app/${company.id}/team`)
}

const removeCompanyMemberSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
})

export async function removeCompanyMember(input: unknown) {
  const parsed = removeCompanyMemberSchema.parse(input)
  const supabase = await getClient()
  await assertGroupAdmin(supabase)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, group_id')
    .eq('id', parsed.companyId)
    .single()
  if (companyError || !company) throw new Error('Entreprise introuvable.')

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id')
    .eq('group_id', company.group_id)
    .eq('company_id', company.id)
    .eq('user_id', parsed.userId)
    .maybeSingle()
  if (membershipError) throw new Error(membershipError.message)
  if (!membership?.id) throw new Error('Impossible: ce membre vient du niveau groupe.')

  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membership.id)
  if (error) throw new Error(error.message)

  revalidatePath('/app')
  revalidatePath(`/app/${company.id}/team`)
}

const invitationSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email('Email invalide'),
  role: z.enum(['company_admin', 'finance_manager', 'viewer']),
})

function invitationBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  // next dev peut utiliser un autre port (ex. 3001) ; PORT est souvent défini par le CLI
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}`
}

async function sendSupabaseInvitationEmail(email: string, redirectTo: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      sent: false,
      error: "SUPABASE_SERVICE_ROLE_KEY manquant. Invitation créée sans email (lien copié).",
    } as const
  }
  const service = getService()
  const { error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })
  if (error) {
    const msg = error.message?.toLowerCase?.() ?? ''
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      // Fallback: user exists already -> send password setup/reset flow email.
      const { error: resetErr } = await service.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (!resetErr) {
        return {
          sent: true,
          error: null,
        } as const
      }
      // Second fallback: magic link sign-in for existing user only.
      const { error: otpErr } = await service.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      })
      if (!otpErr) {
        return {
          sent: true,
          error: null,
        } as const
      }
      const statusReset = typeof (resetErr as any).status === 'number' ? (resetErr as any).status : undefined
      const codeReset = typeof (resetErr as any).code === 'string' ? (resetErr as any).code : undefined
      const partsReset = [statusReset ? `status=${statusReset}` : null, codeReset ? `code=${codeReset}` : null]
        .filter(Boolean)
        .join(' ')
      const statusOtp = typeof (otpErr as any).status === 'number' ? (otpErr as any).status : undefined
      const codeOtp = typeof (otpErr as any).code === 'string' ? (otpErr as any).code : undefined
      const partsOtp = [statusOtp ? `status=${statusOtp}` : null, codeOtp ? `code=${codeOtp}` : null]
        .filter(Boolean)
        .join(' ')
      return {
        sent: false,
        error:
          `Email non envoyé: reset=${partsReset ? `[${partsReset}] ` : ''}${resetErr.message}; ` +
          `otp=${partsOtp ? `[${partsOtp}] ` : ''}${otpErr.message}. ` +
          `Invitation créée sans email (lien copié).`,
      } as const
    }
    const status = typeof (error as any).status === 'number' ? (error as any).status : undefined
    const code = typeof (error as any).code === 'string' ? (error as any).code : undefined
    const parts = [status ? `status=${status}` : null, code ? `code=${code}` : null].filter(Boolean).join(' ')
    return {
      sent: false,
      error: `Email non envoyé: ${parts ? `[${parts}] ` : ''}${error.message}. Invitation créée sans email (lien copié).`,
    } as const
  }
  return { sent: true, error: null } as const
}

export async function inviteCompanyMember(input: unknown) {
  const parsed = invitationSchema.parse(input)
  const supabase = await getClient()
  await assertGroupAdmin(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, group_id')
    .eq('id', parsed.companyId)
    .single()
  if (companyError || !company) throw new Error('Entreprise introuvable.')

  const email = parsed.email.trim().toLowerCase()
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

  const { data: existing, error: existingErr } = await supabase
    .from('company_member_invitations')
    .select('id, status, sent_count')
    .eq('company_id', company.id)
    .ilike('email', email)
    .eq('status', 'pending')
    .maybeSingle()
  if (existingErr) throw new Error(existingErr.message)

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from('company_member_invitations')
      .update({
        role: parsed.role,
        invitation_token: token,
        expires_at: expiresAt,
        last_sent_at: new Date().toISOString(),
        sent_count: Number(existing.sent_count ?? 0) + 1,
      })
      .eq('id', existing.id)
    if (updErr) throw new Error(updErr.message)
  } else {
    const { error: insErr } = await supabase.from('company_member_invitations').insert({
      company_id: company.id,
      group_id: company.group_id,
      email,
      role: parsed.role,
      invitation_token: token,
      expires_at: expiresAt,
      invited_by_user_id: user.id,
    })
    if (insErr) throw new Error(insErr.message)
  }

  const inviteLink = `${invitationBaseUrl()}/auth/setup-account?inviteToken=${token}`
  const mail = await sendSupabaseInvitationEmail(email, inviteLink)
  revalidatePath(`/app/${company.id}/team`)
  return { inviteLink, emailSent: mail.sent, emailError: mail.error }
}

const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
})

export async function resendCompanyInvitation(input: unknown) {
  const parsed = invitationIdSchema.parse(input)
  const supabase = await getClient()
  await assertGroupAdmin(supabase)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

  const { data: invitation, error: invErr } = await supabase
    .from('company_member_invitations')
    .select('id, company_id, email, sent_count, status')
    .eq('id', parsed.invitationId)
    .single()
  if (invErr || !invitation) throw new Error('Invitation introuvable.')
  if (invitation.status !== 'pending') throw new Error("Invitation non active.")

  const { error } = await supabase
    .from('company_member_invitations')
    .update({
      invitation_token: token,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
      sent_count: Number(invitation.sent_count ?? 0) + 1,
    })
    .eq('id', invitation.id)
  if (error) throw new Error(error.message)

  const inviteLink = `${invitationBaseUrl()}/auth/setup-account?inviteToken=${token}`
  const mail = await sendSupabaseInvitationEmail(String(invitation.email), inviteLink)
  revalidatePath(`/app/${invitation.company_id}/team`)
  return { inviteLink, emailSent: mail.sent, emailError: mail.error }
}

export async function cancelCompanyInvitation(input: unknown) {
  const parsed = invitationIdSchema.parse(input)
  const supabase = await getClient()
  await assertGroupAdmin(supabase)

  const { data: invitation, error: invErr } = await supabase
    .from('company_member_invitations')
    .select('id, company_id')
    .eq('id', parsed.invitationId)
    .single()
  if (invErr || !invitation) throw new Error('Invitation introuvable.')

  const { error } = await supabase
    .from('company_member_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitation.id)
  if (error) throw new Error(error.message)

  revalidatePath(`/app/${invitation.company_id}/team`)
}

export async function validateCompanyInvitation(input: unknown) {
  const parsed = invitationIdSchema.parse(input)
  const supabase = await getClient()
  const service = getService()
  await assertGroupAdmin(supabase)

  const { data: invitation, error: invErr } = await service
    .from('company_member_invitations')
    .select('id, company_id, status')
    .eq('id', parsed.invitationId)
    .single()
  if (invErr || !invitation) throw new Error('Invitation introuvable.')
  if (invitation.status !== 'pending') throw new Error("Invitation non active.")
  const { error: rpcErr } = await service.rpc('admin_accept_company_invitation', {
    p_invitation_id: invitation.id,
  })
  if (rpcErr) throw new Error(rpcErr.message)

  revalidatePath('/app')
  revalidatePath(`/app/${invitation.company_id}/team`)
}

export async function acceptCompanyInvitation(token: string) {
  if (!token) throw new Error('Token invitation manquant.')
  const supabase = await getClient()
  const service = getService()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: invitation, error: invErr } = await service
    .from('company_member_invitations')
    .select('id, company_id, group_id, email, role, status, expires_at')
    .eq('invitation_token', token)
    .maybeSingle()
  if (invErr) throw new Error(invErr.message)
  if (!invitation) throw new Error('Invitation introuvable.')
  if (invitation.status !== 'pending') throw new Error('Invitation non active.')
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new Error('Invitation expirée.')
  }
  if (!user.email || user.email.toLowerCase() !== String(invitation.email).toLowerCase()) {
    throw new Error(`Cette invitation est liée à ${invitation.email}. Connectez-vous avec cet email.`)
  }
  const safeUserId = user.id

  const { data: existingMembership, error: memErr } = await service
    .from('memberships')
    .select('id')
    .eq('user_id', safeUserId)
    .eq('group_id', invitation.group_id)
    .eq('company_id', invitation.company_id)
    .maybeSingle()
  if (memErr) throw new Error(memErr.message)

  if (!existingMembership?.id) {
    const { error: insertErr } = await service.from('memberships').insert({
      user_id: safeUserId,
      group_id: invitation.group_id,
      company_id: invitation.company_id,
      role: invitation.role,
    })
    if (insertErr) throw new Error(insertErr.message)
  }

  const { error: updErr } = await service
    .from('company_member_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)
  if (updErr) throw new Error(updErr.message)

  revalidatePath('/app')
  revalidatePath(`/app/${invitation.company_id}/team`)
  return { companyId: invitation.company_id }
}

export async function acceptLatestPendingInvitationForCurrentUser() {
  const supabase = await getClient()
  const service = getService()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { companyId: null as string | null }

  const email = user.email.trim().toLowerCase()
  const safeUserId = user.id
  const { data: invitation, error: invErr } = await service
    .from('company_member_invitations')
    .select('id, company_id, group_id, role, status, expires_at')
    .ilike('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (invErr) throw new Error(invErr.message)
  if (!invitation) return { companyId: null as string | null }
  if (new Date(invitation.expires_at).getTime() < Date.now()) return { companyId: null as string | null }

  const { data: existingMembership, error: memErr } = await service
    .from('memberships')
    .select('id')
    .eq('user_id', safeUserId)
    .eq('group_id', invitation.group_id)
    .eq('company_id', invitation.company_id)
    .maybeSingle()
  if (memErr) throw new Error(memErr.message)

  if (!existingMembership?.id) {
    const { error: insertErr } = await service.from('memberships').insert({
      user_id: safeUserId,
      group_id: invitation.group_id,
      company_id: invitation.company_id,
      role: invitation.role,
    })
    if (insertErr) throw new Error(insertErr.message)
  }

  const { error: updErr } = await service
    .from('company_member_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)
  if (updErr) throw new Error(updErr.message)

  revalidatePath('/app')
  revalidatePath(`/app/${invitation.company_id}/team`)
  return { companyId: invitation.company_id as string }
}
