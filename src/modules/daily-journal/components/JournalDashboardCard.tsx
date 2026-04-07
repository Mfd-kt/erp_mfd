import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { JournalCardData } from '../types'
import { MOOD_EMOJIS, MOOD_LABELS, type MoodLevel } from '../types'
import { todayIsoDateUTC } from '../utils'

function excerpt(text: string | null, max = 80): string {
  if (!text?.trim()) return ''
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

export function JournalDashboardCard({ data }: { data: JournalCardData }) {
  const { todayEntry, yesterdayEntry, streakDays, hasAnyEntry } = data
  const today = todayIsoDateUTC()

  if (!hasAnyEntry) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-100">
            <BookOpen className="h-4 w-4 text-zinc-400" />
            Journal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Commence à suivre ta journée quotidiennement.
          </p>
          <Button asChild variant="default" size="sm">
            <Link href="/app/journal/today">Démarrer</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (todayEntry) {
    const mood = todayEntry.mood as MoodLevel
    const body = excerpt(todayEntry.accomplished)
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold text-zinc-100">
            <span className="flex items-center gap-2">
              Journal du jour
              <span className="text-xl" aria-hidden>
                {MOOD_EMOJIS[mood]}
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-400">
            {body || <span className="italic text-zinc-600">Pas de résumé saisi.</span>}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
            {streakDays > 1 ? (
              <p className="text-xs text-amber-200/90">
                🔥 {streakDays} jours de suite
              </p>
            ) : (
              <span />
            )}
            <Link
              href={`/app/journal/${today}`}
              className="text-sm font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
            >
              Voir
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const yMood = yesterdayEntry ? (yesterdayEntry.mood as MoodLevel) : null

  return (
    <Card className="border border-amber-900/40 bg-amber-950/15 ring-1 ring-amber-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-100">
          <BookOpen className="h-4 w-4 text-amber-200/80" />
          Journal du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {yMood != null ? (
          <p className="text-sm text-zinc-500">
            Hier :{' '}
            <span className="text-zinc-400">
              {MOOD_EMOJIS[yMood]} {MOOD_LABELS[yMood]}
            </span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Pense à noter ton ressenti aujourd&apos;hui.</p>
        )}
        {streakDays > 0 ? (
          <p className="text-xs text-amber-200/80">🔥 {streakDays} jour(s) de suite</p>
        ) : null}
        <Button asChild variant="default" size="sm">
          <Link href="/app/journal/today">Écrire le journal</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
