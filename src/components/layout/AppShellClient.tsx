'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Company, Group, MembershipRole } from '@/lib/supabase/types'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface AppShellClientProps {
  children: React.ReactNode
  user: User
  profile: {
    display_name?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
  } | null
  companies: Company[]
  group: Group | null
  role: MembershipRole
  isGroupAdmin: boolean
  calendarConnected: boolean
}

export default function AppShellClient({
  children,
  user,
  profile,
  companies,
  group,
  role,
  isGroupAdmin,
  calendarConnected,
}: AppShellClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 print:min-h-0">
      <Sidebar
        companies={companies}
        group={group}
        role={role}
        isGroupAdmin={isGroupAdmin}
        calendarConnected={calendarConnected}
        className="hidden md:flex"
      />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[86vw] max-w-72 border-zinc-800 bg-zinc-950 p-0 md:hidden">
          <Sidebar
            companies={companies}
            group={group}
            role={role}
            isGroupAdmin={isGroupAdmin}
            calendarConnected={calendarConnected}
            className="relative inset-auto h-dvh w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex h-dvh min-h-0 flex-col md:pl-72 print:h-auto print:min-h-0 print:pl-0">
        <RealtimeRefresh />
        <TopBar user={user} profile={profile} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="relative z-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-4 md:px-8 md:py-8 print:max-w-none print:px-4 print:py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
