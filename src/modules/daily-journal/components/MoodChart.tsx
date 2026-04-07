'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { MOOD_EMOJIS, MOOD_LABELS, type MoodLevel } from '../types'
import { formatJournalDate } from '../utils'

type EntryRow = {
  journal_date: string
  mood: MoodLevel
  overall_rating: number | null
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
}

function MoodTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as {
    journal_date: string
    mood: MoodLevel
    overall_rating: number | null
  }
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs capitalize text-zinc-400">{formatJournalDate(row.journal_date)}</p>
      <p className="text-zinc-100">
        <span className="mr-1">{MOOD_EMOJIS[row.mood]}</span>
        {MOOD_LABELS[row.mood]} <span className="text-zinc-500">({row.mood}/5)</span>
      </p>
      {row.overall_rating != null ? (
        <p className="mt-1 text-xs text-zinc-400">Note globale : {row.overall_rating}/5</p>
      ) : null}
    </div>
  )
}

export function MoodChart({ entries }: { entries: EntryRow[] }) {
  const hasOverall = entries.some((e) => e.overall_rating != null)

  const chartData = entries.map((e) => ({
    journal_date: e.journal_date,
    dayShort: shortDate(e.journal_date),
    mood: e.mood,
    overall_rating: e.overall_rating,
  }))

  if (entries.length < 2) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-zinc-200">Évolution de l&apos;humeur</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[220px] items-center justify-center text-sm text-zinc-500">
          Pas assez de données pour afficher le graphique
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-zinc-200">Évolution de l&apos;humeur</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="dayShort"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#52525b' }}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#52525b' }}
              />
              <Tooltip content={MoodTooltip} />
              <Legend
                wrapperStyle={{ paddingTop: 8 }}
                formatter={(value) => (
                  <span className="text-xs text-zinc-400">
                    {value === 'mood' ? 'Humeur' : value === 'overall_rating' ? 'Note globale' : value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="mood"
                name="mood"
                stroke="#e4e4e7"
                strokeWidth={2}
                dot={{ fill: '#e4e4e7', r: 4 }}
                activeDot={{ r: 6 }}
              />
              {hasOverall ? (
                <Line
                  type="monotone"
                  dataKey="overall_rating"
                  name="overall_rating"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ fill: '#64748b', r: 3 }}
                  connectNulls
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
