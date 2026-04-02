'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { LogOut, Settings } from 'lucide-react'
import { NotificationBell } from '@/modules/notifications/components/NotificationBell'
import type { User } from '@supabase/supabase-js'

interface TopBarProps {
  user: User
  profile: { full_name?: string | null; email?: string } | null
}

export default function TopBar({ user, profile }: TopBarProps) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const initials = (profile?.full_name ?? user.email ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/95 px-6 backdrop-blur">
      <div>
        <p className="section-label">ERP financier multi-sociétés</p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell userId={user.id} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1.5 transition-colors hover:border-zinc-700">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-white text-xs font-semibold text-zinc-950">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm text-zinc-300 sm:block">
              {profile?.full_name ?? user.email}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-950 text-zinc-200">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{profile?.full_name ?? 'Utilisateur'}</p>
              <p className="text-xs text-zinc-400">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem className="cursor-pointer gap-2 hover:bg-zinc-900">
              <Settings size={14} />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer gap-2 text-red-400 hover:bg-zinc-900 hover:text-red-300"
            >
              <LogOut size={14} />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
