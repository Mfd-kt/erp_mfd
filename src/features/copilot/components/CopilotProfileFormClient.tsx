'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { saveCopilotProfileAction } from '../actions'

interface Initial {
  profile_summary: string | null
  dominant_focus: string | null
  preferred_output_style: string | null
  estimated_risk_tolerance: string | null
  decision_style: string | null
  recurring_topics: string[]
  recurring_biases: string[]
  strong_patterns: string[]
}

export function CopilotProfileFormClient({ initial, disabled = false }: { initial: Initial; disabled?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(initial.profile_summary ?? '')
  const [focus, setFocus] = useState(initial.dominant_focus ?? '')
  const [style, setStyle] = useState(initial.preferred_output_style ?? '')
  const [risk, setRisk] = useState(initial.estimated_risk_tolerance ?? '')
  const [decision, setDecision] = useState(initial.decision_style ?? '')
  const [topics, setTopics] = useState(initial.recurring_topics.join(', '))
  const [biases, setBiases] = useState(initial.recurring_biases.join(' | '))
  const [patterns, setPatterns] = useState(initial.strong_patterns.join(' | '))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    setLoading(true)
    try {
      await saveCopilotProfileAction({
        profile_summary: summary || null,
        dominant_focus: focus || null,
        preferred_output_style: style || null,
        estimated_risk_tolerance: risk || null,
        decision_style: decision || null,
        recurring_topics: topics
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        recurring_biases: biases
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
        strong_patterns: patterns
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="text-xs font-medium text-zinc-500">Résumé profil (libre)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-zinc-500">Focus dominant</label>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500">Tolérance au risque (estimation)</label>
          <input
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-500">Style de réponse souhaité</label>
        <input
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-500">Style décisionnel (auto-déclaré)</label>
        <input
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-500">Sujets récurrents (tags, virgules)</label>
        <input
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-500">Points de vigilance (séparés par |)</label>
        <input
          value={biases}
          onChange={(e) => setBiases(e.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-500">Points forts (séparés par |)</label>
        <input
          value={patterns}
          onChange={(e) => setPatterns(e.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
        />
      </div>
      <Button type="submit" disabled={loading || disabled} className="border border-amber-500/30 bg-amber-500/15 text-amber-100">
        {loading ? 'Enregistrement…' : 'Enregistrer le profil'}
      </Button>
    </form>
  )
}
