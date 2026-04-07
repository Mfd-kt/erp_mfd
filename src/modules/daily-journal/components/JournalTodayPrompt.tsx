import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatJournalDate } from '../utils'

export function JournalTodayPrompt({ date }: { date: string }) {
  const label = formatJournalDate(date)
  return (
    <div className="relative pl-6 sm:pl-8">
      <span
        className="absolute left-0 top-6 h-3 w-3 rounded-full border-2 border-dashed border-zinc-600 bg-zinc-950"
        aria-hidden
      />
      <div className="rounded-2xl border border-dashed border-zinc-600/80 bg-zinc-950/40 px-5 py-6 sm:px-6">
        <p className="playfair-serif text-lg font-medium capitalize text-zinc-300">
          {label}
        </p>
        <p className="mt-2 text-sm text-zinc-500">Comment s&apos;est passée ta journée ?</p>
        <Button asChild className="mt-4" variant="default" size="sm">
          <Link href={`/app/journal/${date}`}>Écrire</Link>
        </Button>
      </div>
    </div>
  )
}
