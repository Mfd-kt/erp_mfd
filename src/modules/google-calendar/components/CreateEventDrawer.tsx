'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GoogleCalendarSelection } from '../types'
import { createCalendarEvent } from '../actions'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
export function CreateEventDrawer({
  open,
  onOpenChange,
  calendars,
  defaultDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendars: GoogleCalendarSelection[]
  defaultDate: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [allDay, setAllDay] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('is_all_day', allDay ? 'true' : 'false')
    startTransition(async () => {
      const r = await createCalendarEvent(fd)
      if (r.error) {
        setError(r.error)
        return
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-zinc-800 bg-zinc-950 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nouvel événement</SheetTitle>
          <SheetDescription>Création dans Google Calendar (serveur).</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-400">Titre</span>
            <input
              name="title"
              required
              maxLength={200}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-400">Calendrier</span>
            <select
              name="calendar_id"
              required
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              {calendars.map((c) => (
                <option key={c.calendar_id} value={c.calendar_id}>
                  {c.calendar_name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="allDay"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-zinc-600"
            />
            <label htmlFor="allDay" className="text-sm text-zinc-300">
              Journée entière
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-400">Début (date)</span>
              <input
                type="date"
                name="date_start"
                required
                defaultValue={defaultDate}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-400">Fin (date)</span>
              <input
                type="date"
                name="date_end"
                required
                defaultValue={defaultDate}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>
          {!allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-400">Heure début</span>
                <input
                  type="time"
                  name="time_start"
                  required={!allDay}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-400">Heure fin</span>
                <input
                  type="time"
                  name="time_end"
                  required={!allDay}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>
          ) : null}
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-400">Description (optionnel)</span>
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-400">Lieu (optionnel)</span>
            <input
              name="location"
              maxLength={500}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <SheetFooter className="border-t-0 p-0 pt-2">
            <Button type="submit" disabled={pending || calendars.length === 0} className="w-full">
              {pending ? 'Création…' : 'Créer l&apos;événement'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
