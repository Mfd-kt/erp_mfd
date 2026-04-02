import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { acceptCompanyInvitation } from '@/modules/companies/actions'

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const qs = token ? `?next=${encodeURIComponent(`/app/invitations/accept?token=${token}`)}` : ''
    redirect(`/sign-in${qs}`)
  }

  let error: string | null = null
  let companyId: string | null = null
  if (!token) {
    error = 'Lien invalide: token manquant.'
  } else {
    try {
      const result = await acceptCompanyInvitation(token)
      companyId = result.companyId
    } catch (e) {
      error = e instanceof Error ? e.message : 'Impossible de traiter cette invitation.'
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl py-10">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle>{error ? "Invitation non validée" : 'Invitation acceptée'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : (
            <p className="text-sm text-zinc-300">
              Tu fais maintenant partie de l&apos;entreprise. Tu peux consulter l&apos;équipe et commencer à recevoir des tâches.
            </p>
          )}
          <div className="flex gap-2">
            {companyId ? (
              <Link href={`/app/${companyId}/team`}>
                <Button size="sm">Ouvrir l&apos;équipe</Button>
              </Link>
            ) : null}
            <Link href="/app">
              <Button size="sm" variant="outline">Retour au dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
