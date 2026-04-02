'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingSetupLink, setSendingSetupLink] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setInfo(null)
      setLoading(false)
    } else {
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') ? next : '/app')
      router.refresh()
    }
  }

  async function handleSendSetupLink() {
    const next = searchParams.get('next')
    if (!email.trim()) {
      setError('Renseigne ton email pour recevoir le lien.')
      setInfo(null)
      return
    }
    setSendingSetupLink(true)
    setError(null)
    setInfo(null)
    try {
      const supabase = createClient()
      const redirectTo =
        next && next.startsWith('/')
          ? `${window.location.origin}${next}`
          : `${window.location.origin}/auth/setup-account`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setInfo("Lien envoyé. Vérifie ta boîte mail et clique sur le lien pour créer ton mot de passe.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le lien.")
    } finally {
      setSendingSetupLink(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-white font-bold text-xl">ERP MFD</span>
          </div>
          <p className="text-zinc-400 text-sm">Plateforme financière multi-entreprises</p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Connexion</CardTitle>
            <CardDescription className="text-zinc-400">
              Accédez à votre tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="vous@exemple.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              {info && (
                <div className="text-emerald-300 text-sm bg-emerald-950/50 border border-emerald-800 rounded-md px-3 py-2">
                  {info}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={sendingSetupLink}
                className="w-full"
                onClick={handleSendSetupLink}
              >
                {sendingSetupLink ? 'Envoi du lien...' : "Je n'ai pas encore de mot de passe (invitation)"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <p className="text-zinc-300 text-sm">Chargement...</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
