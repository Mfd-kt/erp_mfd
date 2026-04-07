'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { markAllNotificationsRead, markNotificationRead } from '@/modules/notifications/actions'

interface NotificationBellProps {
  userId: string
}

interface NotificationRow {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'critical' | 'success'
  is_read: boolean
  created_at: string
}

function typeDot(type: NotificationRow['type']) {
  if (type === 'critical') return 'bg-red-500'
  if (type === 'warning') return 'bg-amber-400'
  if (type === 'success') return 'bg-emerald-400'
  return 'bg-blue-400'
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const pathname = usePathname()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [isPending, startTransition] = useTransition()
  const currentCompanyId = pathname?.startsWith('/app/') ? pathname.split('/')[2] : undefined
  const notificationsHref = currentCompanyId && currentCompanyId !== 'alerts' && currentCompanyId !== 'analytics' && currentCompanyId !== 'forecast' && currentCompanyId !== 'settings'
    ? `/app/${currentCompanyId}/notifications`
    : '/app/alerts'

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8)
      setItems((data ?? []) as NotificationRow[])
    }

    load()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  function markOne(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    })
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 border-zinc-800 bg-zinc-950 text-zinc-200">
        <DropdownMenuGroup className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-medium text-zinc-100">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button disabled={isPending} onClick={markAll} className="text-xs text-zinc-400 transition-colors hover:text-white">
              Tout marquer lu
            </button>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-zinc-800" />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-sm text-zinc-500">Aucune notification.</div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} className="items-start gap-3 rounded-lg px-3 py-3 hover:bg-zinc-900" onClick={() => (!item.is_read ? markOne(item.id) : undefined)}>
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${typeDot(item.type)}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>
                  {!item.is_read ? <span className="text-[10px] uppercase tracking-[0.12em] text-white">Nouveau</span> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.message}</p>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem render={<Link href={notificationsHref} />} className="justify-center rounded-lg px-3 py-2 text-sm text-white hover:bg-zinc-900">
          Voir le centre
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
