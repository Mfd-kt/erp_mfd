import Link from 'next/link'
import {
  MOOD_EMOJIS,
  type DailyJournalEntry,
  type JournalEnergyLevel,
  type MoodLevel,
} from '../types'
import { cn } from '@/lib/utils'

const ENERGY_LABEL: Record<JournalEnergyLevel, string> = {
  low: 'Énergie basse',
  medium: 'Énergie moyenne',
  high: 'Énergie haute',
}

const ENERGY_STYLE: Record<JournalEnergyLevel, string> = {
  low: 'border-rose-800/50 bg-rose-950/50 text-rose-200',
  medium: 'border-amber-800/50 bg-amber-950/50 text-amber-200',
  high: 'border-emerald-800/50 bg-emerald-950/50 text-emerald-200',
}

function excerpt(text: string | null, max = 160): string {
  if (!text?.trim()) return '—'
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

function StarRow({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(1, Math.round(rating)))
  return (
    <div
      className="flex gap-0.5 text-amber-400/95"
      aria-label={`Note globale ${r} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('text-sm leading-none', i > r ? 'opacity-20' : '')}>
          ★
        </span>
      ))}
    </div>
  )
}

export function JournalEntryCard({ entry }: { entry: DailyJournalEntry }) {
  const d = new Date(entry.journal_date + 'T12:00:00')
  const title = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const mood = entry.mood as MoodLevel
  const intentionsNoted = Boolean(entry.intentions_tomorrow?.trim())

  return (
    <Link href={`/app/journal/${entry.journal_date}`} className="group block">
      <article className="rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-4 transition-colors hover:border-zinc-600/80 hover:bg-zinc-900/55 sm:p-5">
        <div className="flex gap-4 sm:gap-5">
          <div className="flex w-14 shrink-0 flex-col items-center border-r border-zinc-800/60 pr-4 text-center sm:w-16">
            <span className="text-3xl leading-none transition-transform group-hover:scale-105" aria-hidden>
              {MOOD_EMOJIS[mood]}
            </span>
            <span className="mt-2 font-mono text-xs tabular-nums text-zinc-500">
              {mood} / 5
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="playfair-serif text-lg font-medium capitalize leading-snug text-zinc-100 sm:text-xl">
                {title}
              </h3>
              {entry.overall_rating != null ? (
                <StarRow rating={entry.overall_rating} />
              ) : (
                <span className="hidden text-xs text-zinc-600 sm:inline"> </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                  ENERGY_STYLE[entry.energy_level]
                )}
              >
                {ENERGY_LABEL[entry.energy_level]}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400 line-clamp-3">
              {excerpt(entry.accomplished)}
            </p>

            {intentionsNoted ? (
              <p className="mt-2 text-xs text-zinc-500">
                <span className="text-zinc-600">↳</span> Intentions notées
              </p>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  )
}
