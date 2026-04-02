'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { acceptLatestPendingInvitationForCurrentUser } from '@/modules/companies/actions'

function SetupAccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const inviteToken = searchParams.get('inviteToken') ?? ''
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function bootstrap() {
      setLoading(true)
      setError(null)
      const { data, error: userErr } = await supabase.auth.getUser()
      if (userErr || !data.user) {
        const next = `/auth/setup-account${inviteToken ? `?inviteToken=${encodeURIComponent(inviteToken)}` : ''}`
        router.replace(`/sign-in?next=${encodeURIComponent(next)}`)
        return
      }
      setEmail(data.user.email ?? '')
      setFirstName((data.user.user_metadata?.first_name as string) ?? '')
      setLastName((data.user.user_metadata?.last_name as string) ?? '')
      setPhone((data.user.user_metadata?.phone as string) ?? '')
      setLoading(false)
    }
    bootstrap()
  }, [supabase, router, inviteToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nom et prénom sont requis.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.')
      return
    }

    setSaving(true)
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { data, error: userErr } = await supabase.auth.getUser()
      if (userErr || !data.user) throw new Error('Session invalide, reconnecte-toi.')

      const { error: updateAuthErr } = await supabase.auth.updateUser({
        password,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: displayName,
          phone: phone.trim() || null,
        },
      })
      if (updateAuthErr) throw new Error(updateAuthErr.message)

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: data.user.id,
          email: data.user.email ?? null,
          display_name: displayName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
      if (profileErr) throw new Error(profileErr.message)

      if (inviteToken) {
        router.push(`/app/invitations/accept?token=${encodeURIComponent(inviteToken)}`)
      } else {
        const accepted = await acceptLatestPendingInvitationForCurrentUser()
        if (accepted?.companyId) {
          router.push(`/app/${accepted.companyId}/dashboard`)
        } else {
          router.push('/app')
        }
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <p className="text-zinc-300 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Créer votre compte</CardTitle>
            <CardDescription className="text-zinc-400">
              Définissez votre mot de passe et complétez vos informations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Prénom *</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Nom *</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 ..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Mot de passe *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Enregistrement...' : 'Créer mon compte'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <p className="text-zinc-300 text-sm">Chargement...</p>
        </div>
      }
    >
      <SetupAccountForm />
    </Suspense>
  )
}
