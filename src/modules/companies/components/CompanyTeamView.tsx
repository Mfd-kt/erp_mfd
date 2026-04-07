'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  addCompanyMember,
  cancelCompanyInvitation,
  createCompanyMemberAccount,
  inviteCompanyMember,
  removeCompanyMember,
  resendCompanyInvitation,
  validateCompanyInvitation,
  updateCompanyMemberRole,
} from '@/modules/companies/actions'
import type { Company } from '@/lib/supabase/types'

type TeamMemberRow = {
  user_id: string
  display_name: string
  email: string | null
  role: 'group_admin' | 'company_admin' | 'finance_manager' | 'viewer'
  source: 'group' | 'company'
  companyMembershipId: string | null
}

type TeamInvitationRow = {
  id: string
  email: string
  role: 'company_admin' | 'finance_manager' | 'viewer'
  status: 'pending'
  expires_at: string
  last_sent_at: string
  sent_count: number
}

interface CompanyTeamViewProps {
  company: Company
  canManage: boolean
  members: TeamMemberRow[]
  invitations: TeamInvitationRow[]
}

function roleLabel(role: TeamMemberRow['role']) {
  if (role === 'group_admin') return 'Admin groupe'
  if (role === 'company_admin') return 'Admin entreprise'
  if (role === 'finance_manager') return 'Finance manager'
  return 'Membre'
}

export function CompanyTeamView({ company, canManage, members, invitations }: CompanyTeamViewProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'company_admin' | 'finance_manager' | 'viewer'>('viewer')
  const [mode, setMode] = useState<'existing' | 'direct'>('existing')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await addCompanyMember({ companyId: company.id, email, role })
      setFeedback('Membre ajouté avec succès.')
      setOpen(false)
      setEmail('')
      setPassword('')
      setDisplayName('')
      setRole('viewer')
      setMode('existing')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'ajout")
    } finally {
      setSaving(false)
    }
  }

  async function handleInviteMember() {
    setSaving(true)
    setError(null)
    try {
      const result = await inviteCompanyMember({ companyId: company.id, email, role })
      if (result?.inviteLink) await navigator.clipboard.writeText(result.inviteLink)
      setFeedback(result?.emailSent ? 'Invitation envoyée par email.' : (result?.emailError ?? "Invitation créée. Lien d'invitation copié."))
      setOpen(false)
      setEmail('')
      setPassword('')
      setDisplayName('')
      setRole('viewer')
      setMode('existing')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'invitation")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <HeroPageHeader
        title={`Équipe — ${company.trade_name ?? company.legal_name}`}
        subtitle="Membres pouvant recevoir des tâches sur cette entreprise."
        rightSlot={
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={!canManage}
            title={!canManage ? 'Droits insuffisants' : undefined}
          >
            Ajouter membre
          </Button>
        }
      />

      <SectionBlock
        title="Membres"
        subtitle={`${members.length} membre(s) visibles (entreprise + admins groupe).`}
      >
        {feedback ? (
          <p className="mb-2 rounded border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">{feedback}</p>
        ) : null}
        {error ? (
          <p className="mb-2 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>
        ) : null}
        {members.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun membre.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={`${m.user_id}-${m.source}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-100">{m.display_name}</p>
                  <p className="truncate text-xs text-zinc-500">{m.email ?? `${m.user_id.slice(0, 8)}…`}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.source === 'company' && canManage ? (
                    <select
                      value={m.role}
                      onChange={async (e) => {
                        try {
                          await updateCompanyMemberRole({
                            companyId: company.id,
                            userId: m.user_id,
                            role: e.target.value,
                          })
                          router.refresh()
                        } catch {
                          // no-op UI, page shows unchanged role
                        }
                      }}
                      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200"
                    >
                      <option value="viewer">Membre</option>
                      <option value="finance_manager">Finance manager</option>
                      <option value="company_admin">Admin entreprise</option>
                    </select>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-zinc-300">{roleLabel(m.role)}</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] text-zinc-500">
                    {m.source === 'group' ? 'Groupe' : 'Entreprise'}
                  </Badge>
                  {m.source === 'company' && canManage ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={async () => {
                        try {
                          await removeCompanyMember({ companyId: company.id, userId: m.user_id })
                          router.refresh()
                        } catch {
                          // no-op UI
                        }
                      }}
                    >
                      Retirer
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock
        title="Invitations"
        subtitle="Invitations en attente: renvoi, annulation, copie du lien."
      >
        {invitations.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune invitation en attente.</p>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-100">{inv.email}</p>
                  <p className="text-xs text-zinc-500">
                    {roleLabel(inv.role as TeamMemberRow['role'])} · envoi: {new Date(inv.last_sent_at).toLocaleDateString('fr-FR')} · tentatives: {inv.sent_count}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!canManage}
                    onClick={async () => {
                      try {
                        await validateCompanyInvitation({ invitationId: inv.id })
                        setFeedback('Invitation validée. Membre ajouté.')
                        setError(null)
                        router.refresh()
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Erreur de validation")
                      }
                    }}
                  >
                    Valider
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!canManage}
                    onClick={async () => {
                        try {
                          const result = await resendCompanyInvitation({ invitationId: inv.id })
                          if (result?.inviteLink) await navigator.clipboard.writeText(result.inviteLink)
                          setFeedback(result?.emailSent ? 'Invitation renvoyée par email.' : (result?.emailError ?? "Invitation renvoyée. Lien copié."))
                          setError(null)
                          router.refresh()
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Erreur de renvoi')
                        }
                    }}
                  >
                    Renvoyer
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!canManage}
                    onClick={async () => {
                        try {
                          await cancelCompanyInvitation({ invitationId: inv.id })
                          setFeedback('Invitation annulée.')
                          setError(null)
                          router.refresh()
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Erreur d'annulation")
                        }
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Entreprise: {company.trade_name ?? company.legal_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`rounded px-2 py-1.5 text-xs ${mode === 'existing' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
              >
                Utilisateur existant
              </button>
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`rounded px-2 py-1.5 text-xs ${mode === 'direct' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
              >
                Créer compte direct
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            {mode === 'direct' ? (
              <>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Nom affiché (optionnel)</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    placeholder="Ex: Ahmed Ben Ali"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Mot de passe initial *</label>
                  <input
                    type="password"
                    required={mode === 'direct'}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    placeholder="8 caractères minimum"
                  />
                </div>
              </>
            ) : null}
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'company_admin' | 'finance_manager' | 'viewer')}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              >
                <option value="viewer">Membre (lecture)</option>
                <option value="finance_manager">Finance manager</option>
                <option value="company_admin">Admin entreprise</option>
              </select>
            </div>
            {error ? (
              <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="button" variant="outline" onClick={handleInviteMember} disabled={saving || !canManage || !email.trim() || mode === 'direct'}>
                Envoyer invitation
              </Button>
              {mode === 'direct' ? (
                <Button
                  type="button"
                  disabled={saving || !canManage || !email.trim() || password.length < 8}
                  onClick={async () => {
                    setSaving(true)
                    setError(null)
                    try {
                      await createCompanyMemberAccount({
                        companyId: company.id,
                        email,
                        password,
                        role,
                        displayName: displayName.trim() || undefined,
                      })
                      setFeedback('Compte créé et membre ajouté. Il peut se connecter immédiatement.')
                      setOpen(false)
                      setEmail('')
                      setPassword('')
                      setDisplayName('')
                      setRole('viewer')
                      setMode('existing')
                      router.refresh()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Erreur de création de compte')
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? 'Création...' : 'Créer compte + ajouter'}
                </Button>
              ) : (
                <Button type="submit" disabled={saving || !canManage}>
                  {saving ? 'Ajout...' : 'Ajouter'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
