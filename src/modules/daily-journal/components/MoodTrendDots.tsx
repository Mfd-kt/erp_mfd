import type { MoodLevel } from '../types'

const DOT: Record<MoodLevel, string> = {
  1: '#dc2626',
  2: '#ea580c',
  3: '#ca8a04',
  4: '#86efac',
  5: '#22c55e',
}

export function MoodTrendDots({ moods }: { moods: (MoodLevel | null)[] }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Tendance d’humeur sur 7 jours">
      {moods.map((m, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full border border-zinc-800/80"
          style={{
            backgroundColor: m != null ? DOT[m] : '#27272a',
            opacity: m != null ? 1 : 0.5,
          }}
          title={m != null ? `Jour ${i + 1} : ${m}/5` : `Jour ${i + 1} : pas d’entrée`}
        />
      ))}
    </div>
  )
}
