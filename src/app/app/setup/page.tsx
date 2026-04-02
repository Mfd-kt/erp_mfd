import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { SetupForm } from '@/modules/setup/components/SetupForm'

export default async function SetupPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  // Never show setup to users who already belong to at least one company.
  if (scope.companies.length > 0) {
    const firstCompany = scope.companies[0]
    redirect(`/app/${firstCompany.id}/dashboard`)
  }

  // Group admin without company yet can continue group/company setup flow.
  if (scope.group) {
    if (scope.isGroupAdmin) {
      redirect('/app/settings/companies')
    }
    redirect('/app/tasks')
  }

  // Invited user without membership yet: route to invitation acceptance instead of initial setup.
  const supabase = await createClient()
  const email = scope.user.email?.trim().toLowerCase()
  if (email) {
    const { data: pendingInvitation } = await supabase
      .from('company_member_invitations')
      .select('invitation_token')
      .ilike('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pendingInvitation?.invitation_token) {
      redirect(`/app/invitations/accept?token=${pendingInvitation.invitation_token}`)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <HeroPageHeader
        title="Configuration initiale"
        subtitle="Créez votre groupe pour commencer à utiliser l'ERP."
      />

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <p className="mb-6 text-sm text-zinc-400">
            Vous n&apos;avez pas encore de groupe. Créez-en un pour gérer vos sociétés et vos finances.
          </p>
          <SetupForm />
        </CardContent>
      </Card>
    </div>
  )
}
