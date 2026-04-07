'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, Heart, Sparkles, Sun, Zap } from 'lucide-react'
import { upsertJournalEntry } from '../actions'
import { Button } from '@/components/ui/button'
import {
  MOOD_EMOJIS,
  MOOD_LABELS,
  type DailyJournalEntry,
  type JournalEnergyLevel,
  type MoodLevel,
} from '../types'
import { cn } from '@/lib/utils'
import { quoteForJournalDate } from './journal-entry-quotes'

const ENERGY_OPTIONS: { value: JournalEnergyLevel; label: string; hint: string }[] = [
  { value: 'low', label: 'Basse', hint: 'Repos, recharge' },
  { value: 'medium', label: 'Moyenne', hint: 'Rythme classique' },
  { value: 'high', label: 'Haute', hint: 'Plein gaz' },
]

const MOODS: MoodLevel[] = [1, 2, 3, 4, 5]

function completionPercent(args: {
  accomplished: string
  whatFailed: string
  intentions: string
}): number {
  let n = 0
  if (args.accomplished.trim().length >= 12) n++
  if (args.whatFailed.trim().length >= 1) n++
  if (args.intentions.trim().length >= 12) n++
  return Math.round((n / 3) * 100)
}

export function JournalEntryForm({
  journalDate,
  initialEntry,
  isToday = false,
}: {
  journalDate: string
  initialEntry: DailyJournalEntry | null
  isToday?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [mood, setMood] = useState<MoodLevel>((initialEntry?.mood ?? 3) as MoodLevel)
  const [energy, setEnergy] = useState<JournalEnergyLevel>(
    (initialEntry?.energy_level ?? 'medium') as JournalEnergyLevel
  )
  const [rating, setRating] = useState<number | null>(initialEntry?.overall_rating ?? null)
  const [accomplished, setAccomplished] = useState(initialEntry?.accomplished ?? '')
  const [whatFailed, setWhatFailed] = useState(initialEntry?.what_failed ?? '')
  const [intentions, setIntentions] = useState(initialEntry?.intentions_tomorrow ?? '')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const quote = useMemo(() => quoteForJournalDate(journalDate), [journalDate])
  const completion = useMemo(
    () => completionPercent({ accomplished, whatFailed, intentions }),
    [accomplished, whatFailed, intentions]
  )

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('mood', String(mood))
    fd.set('energy_level', energy)
    fd.set('overall_rating', rating != null ? String(rating) : '')
    fd.set('accomplished', accomplished)
    fd.set('what_failed', whatFailed)
    fd.set('intentions_tomorrow', intentions)

    startTransition(async () => {
      const result = await upsertJournalEntry(fd)
      if ('error' in result) {
        setFeedback({ type: 'error', message: result.error })
        return
      }
      setFeedback({ type: 'success', message: 'Journal enregistré.' })
    })
  }

  return (
    <form
      id="journal-entry-form"
      onSubmit={handleSubmit}
      className="relative flex flex-col gap-8 pb-6 sm:pb-0"
    >
      <input type="hidden" name="journal_date" value={journalDate} />
      <input type="hidden" name="mood" value={mood} />
      <input type="hidden" name="energy_level" value={energy} />

      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-400/90" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-zinc-200">{quote}</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Trois blocs : célébrer, ajuster, projeter. La note et l&apos;humeur complètent ton bilan.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Richesse du bilan
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-400">{completion}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Textes du journal complétés"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600/90 to-amber-500/80 transition-[width] duration-500 ease-out"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      <section className="space-y-4" aria-labelledby="journal-mood-heading">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-400/90" aria-hidden />
          <h2 id="journal-mood-heading" className="text-sm font-semibold text-zinc-100">
            Comment te sens-tu ?
          </h2>
        </div>
        <p className="text-xs text-zinc-500">Humeur du jour — sans jugement, juste un repère.</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={cn(
                'flex min-w-[5rem] flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-xs transition-all',
                mood === m
                  ? 'border-violet-400/50 bg-violet-950/50 shadow-[0_0_0_1px_rgba(167,139,250,0.2)]'
                  : 'border-zinc-800/90 bg-zinc-950/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              )}
            >
              <span className="text-2xl leading-none">{MOOD_EMOJIS[m]}</span>
              <span className="text-center font-medium leading-tight text-zinc-300">{MOOD_LABELS[m]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="journal-energy-heading">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400/90" aria-hidden />
          <h2 id="journal-energy-heading" className="text-sm font-semibold text-zinc-100">
            Niveau d&apos;énergie
          </h2>
        </div>
        <p className="text-xs text-zinc-500">Ressenti physique et mental, pas la performance.</p>
        <div className="flex flex-wrap gap-2">
          {ENERGY_OPTIONS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setEnergy(value)}
              className={cn(
                'flex min-w-[7.5rem] flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm transition-all',
                energy === value
                  ? 'border-amber-500/45 bg-amber-950/35 text-amber-100'
                  : 'border-zinc-800/90 bg-zinc-950/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              )}
            >
              <span className="font-medium">{label}</span>
              <span className="text-[11px] text-zinc-500">{hint}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6">
        <section className="rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-zinc-950/40 p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">
                1
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Sun className="h-4 w-4 text-emerald-400/90" aria-hidden />
                  Ce que j&apos;ai accompli
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Victoires, livrables, gestes dont tu es fier — même modestes.
                </p>
              </div>
            </div>
          </div>
          <textarea
            name="accomplished"
            rows={4}
            value={accomplished}
            onChange={(e) => setAccomplished(e.target.value)}
            className="w-full resize-y rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700/50 focus:outline-none focus:ring-1 focus:ring-emerald-700/30"
            placeholder={
              isToday
                ? 'Ex. : relances, dossiers clos, décisions prises…'
                : 'Ce qui a marqué cette journée…'
            }
          />
        </section>

        <section className="rounded-2xl border border-rose-900/35 bg-gradient-to-b from-rose-950/15 to-zinc-950/40 p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-xs font-semibold text-rose-300">
              2
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Ce qui n&apos;a pas marché</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Frictions, retards, tensions — nommer libère de l&apos;espace mental.
              </p>
            </div>
          </div>
          <textarea
            name="what_failed"
            rows={3}
            value={whatFailed}
            onChange={(e) => setWhatFailed(e.target.value)}
            className="w-full resize-y rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-rose-800/50 focus:outline-none focus:ring-1 focus:ring-rose-900/30"
            placeholder="Blocages, malentendus, fatigue… « Rien » est une réponse valable."
          />
        </section>

        <section className="rounded-2xl border border-violet-900/40 bg-gradient-to-b from-violet-950/25 to-zinc-950/40 p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300">
              3
            </span>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <BookOpen className="h-4 w-4 text-violet-400/90" aria-hidden />
                Intentions pour demain
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Une ou deux priorités réalistes — pas une liste de courses.
              </p>
            </div>
          </div>
          <textarea
            name="intentions_tomorrow"
            rows={3}
            value={intentions}
            onChange={(e) => setIntentions(e.target.value)}
            className="w-full resize-y rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-violet-700/50 focus:outline-none focus:ring-1 focus:ring-violet-700/30"
            placeholder="Ce que tu veux protéger ou débloquer demain…"
          />
        </section>
      </div>

      <section className="space-y-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5" aria-labelledby="journal-rating-heading">
        <h3 id="journal-rating-heading" className="text-sm font-semibold text-zinc-100">
          Note globale (optionnel)
        </h3>
        <p className="text-xs text-zinc-500">Vue d&apos;ensemble de la journée : 1 = difficile, 5 = grande satisfaction.</p>
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating((r) => (r === n ? null : n))}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors',
                rating === n
                  ? 'border-amber-500/80 bg-amber-500/15 text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]'
                  : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              )}
              aria-label={`Note ${n} sur 5`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRating(null)}
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            Effacer
          </button>
        </div>
      </section>

      {feedback ? (
        <p
          className={cn(
            'text-sm',
            feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'
          )}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 border-t border-zinc-800/90 bg-zinc-950/90 px-1 py-4 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            render={
              <Link
                href="/app/journal"
                className="inline-flex items-center justify-center gap-1.5 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
                Voir tout le journal
              </Link>
            }
            variant="ghost"
            size="sm"
            className="order-2 h-auto min-h-0 w-full border-0 p-0 shadow-none sm:order-1 sm:w-auto"
          />
          <Button
            type="submit"
            disabled={pending}
            variant="default"
            size="lg"
            className="order-1 w-full rounded-xl sm:order-2 sm:w-auto sm:min-w-[14rem]"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer la journée'}
          </Button>
        </div>
      </div>
    </form>
  )
}
