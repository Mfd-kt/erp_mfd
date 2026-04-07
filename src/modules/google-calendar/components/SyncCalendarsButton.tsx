'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncCalendarListAction } from '../actions'
import { Button } from '@/components/ui/button'

export function SyncCalendarsButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await syncCalendarListAction()
          if (r.error) {
            window.alert(r.error)
            return
          }
          router.refresh()
        })
      }}
    >
      {pending ? 'Synchronisation…' : 'Resynchroniser les agendas'}
    </Button>
  )
}
