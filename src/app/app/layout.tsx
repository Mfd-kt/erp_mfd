import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', scope.userId)
    .single()

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar
        companies={scope.companies}
        group={scope.group}
        role={scope.role}
        isGroupAdmin={scope.isGroupAdmin}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RealtimeRefresh />
        <TopBar user={scope.user} profile={profile} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
