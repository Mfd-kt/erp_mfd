'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeRefresh() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const refreshSoon = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => router.refresh(), 450)
    }

    const channel = supabase
      .channel('erp-live-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenues' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refreshSoon)
      .subscribe()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
