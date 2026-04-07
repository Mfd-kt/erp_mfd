'use client'

import { useCallback, useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DailyJournalEntry } from '../types'
import { MOOD_EMOJIS } from '../types'
import { computeMonthAggregates } from '../journal-month-aggregates'
import { cn } from '@/lib/utils'
import { JournalMarkdownLite } from './journal-markdown-lite'

export function JournalMonthOverview({
  monthKey,
  entries,
}: {
  monthKey: string
  entries: DailyJournalEntry[]
}) {
  const stats = useMemo(() => computeMonthAggregates(entries, monthKey), [entries, monthKey])
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState<string | null>(null)

  const runMonthAnalysis = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/journal/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'month_synthesis',
          monthPrefix: monthKey,
        }),
      })
      const data = (await res.json()) as { markdown?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erreur')
        setMarkdown(null)
        return
      }
      setMarkdown(data.markdown ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  if (!stats) return null

  const coverage = Math.round((stats.entryCount / stats.monthDayCount) * 100)

  return (
    <div className="mb-5 rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-400/90" aria-hidden />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Vue agrégée
            </h3>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {stats.entryCount} jour{stats.entryCount > 1 ? 's' : ''} journalisé
            {stats.entryCount > 1 ? 's' : ''} sur {stats.monthDayCount} ({coverage}% du mois) — humeur, énergie et
            textes agrégés.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 gap-1 rounded-xl border-zinc-700 text-zinc-300"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? 'Réduire' : 'Détails'}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Humeur moy.</p>
            <p className="mt-1 flex items-baseline gap-1.5 text-lg font-semibold text-zinc-100">
              {stats.avgMood}
              <span className="text-xl" aria-hidden>
                {MOOD_EMOJIS[Math.min(5, Math.max(1, Math.round(stats.avgMood))) as keyof typeof MOOD_EMOJIS]}
              </span>
            </p>
            <p className="text-[11px] text-zinc-600">
              min {stats.moodMin} / max {stats.moodMax}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Énergie</p>
            <p className="mt-1 text-sm text-zinc-200">
              B {stats.energy.low} · M {stats.energy.medium} · H {stats.energy.high}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Note globale moy.</p>
            <p className="mt-1 text-lg font-semibold text-amber-200/95">
              {stats.avgRating != null ? `${stats.avgRating} / 5` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Intentions</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              {stats.daysWithIntentions}/{stats.entryCount}
            </p>
            <p className="text-[11px] text-zinc-600">jours avec intention</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void runMonthAnalysis()}
          disabled={loading}
          className="gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Synthèse & projection du mois (IA)
        </Button>
        <span className="text-xs text-zinc-600">
          Synthèse courte (IA), format cartes — pas un pavé de texte.
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {markdown ? (
        <article
          className={cn(
            'mt-4 max-h-[min(65vh,480px)] overflow-y-auto rounded-xl border border-violet-900/30 bg-zinc-950/40 p-3 sm:p-4'
          )}
        >
          <JournalMarkdownLite source={markdown} />
        </article>
      ) : null}
    </div>
  )
}
