import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDaysToIsoDate } from '../utils'

interface JournalDatePageChromeProps {
  date: string
  formattedTitle: string
  isToday: boolean
}

/**
 * En-tête et navigation pour une entrée journal (retour accueil, veille / lendemain).
 */
export function JournalDatePageChrome({ date, formattedTitle, isToday }: JournalDatePageChromeProps) {
  const prev = addDaysToIsoDate(date, -1)
  const next = addDaysToIsoDate(date, 1)

  return (
    <header className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Button
          render={
            <Link
              href="/app/journal"
              className="inline-flex w-fit items-center gap-2 px-2 py-1 text-sm font-normal text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Retour au journal
            </Link>
          }
          variant="ghost"
          size="sm"
          className="-ml-2 h-auto min-h-0 border-0 p-0 shadow-none hover:bg-transparent"
        />

        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Navigation entre les jours"
        >
          <Button
            render={
              <Link
                href={`/app/journal/${prev}`}
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Veille
              </Link>
            }
            variant="outline"
            size="sm"
            className="h-auto min-h-0 border-0 p-0 shadow-none"
          />
          <Button
            render={
              <Link
                href={`/app/journal/${next}`}
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Lendemain
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            }
            variant="outline"
            size="sm"
            className="h-auto min-h-0 border-0 p-0 shadow-none"
          />
        </nav>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-950/40 via-zinc-950/80 to-zinc-950 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-500/5 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/80">
            {isToday ? "Aujourd'hui" : 'Bilan du jour'}
          </p>
          <h1 className="playfair-serif mt-2 text-3xl font-semibold capitalize tracking-tight text-zinc-50 sm:text-4xl">
            {formattedTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {isToday
              ? 'Quelques minutes pour célébrer ce qui a bougé, nommer les frictions et tracer ton intention pour demain.'
              : 'Tu revis cette journée : humeur, énergie, faits marquants — tout reste modifiable.'}
          </p>
        </div>
      </div>
    </header>
  )
}
