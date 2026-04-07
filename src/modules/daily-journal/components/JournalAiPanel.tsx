'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Sparkles, Copy, Check, Flame, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  JOURNAL_AI_MODES,
  type JournalAiModeId,
  type JournalAiModeMeta,
} from '../journal-ai-modes'
import type { EntrySnapshot } from '../journal-ai-context'
import { createTasksFromJournalAnalysis } from '../actions'
import { cn } from '@/lib/utils'
import { JournalMarkdownLite } from './journal-markdown-lite'

function readSnapshotFromForm(formId: string): EntrySnapshot | null {
  if (typeof document === 'undefined') return null
  const el = document.getElementById(formId)
  if (!el || !(el instanceof HTMLFormElement)) return null
  const fd = new FormData(el)
  const moodRaw = fd.get('mood')
  const mood =
    moodRaw != null && String(moodRaw).length > 0 ? Number(moodRaw) : undefined
  return {
    accomplished: String(fd.get('accomplished') ?? ''),
    what_failed: String(fd.get('what_failed') ?? ''),
    intentions_tomorrow: String(fd.get('intentions_tomorrow') ?? ''),
    energy_level: String(fd.get('energy_level') ?? '') || undefined,
    mood: Number.isFinite(mood) ? mood : undefined,
  }
}

function ModeCard({
  meta,
  selected,
  onSelect,
}: {
  meta: JournalAiModeMeta
  selected: boolean
  onSelect: () => void
}) {
  const Icon = meta.icon
  const critical = meta.critical
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors sm:p-3.5',
        selected && critical
          ? 'border-amber-500/60 bg-amber-950/35 ring-1 ring-amber-500/30'
          : selected
            ? 'border-violet-500/50 bg-violet-950/30 ring-1 ring-violet-500/25'
            : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/50'
      )}
    >
      <span className="flex items-center gap-2">
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            critical ? 'text-amber-400' : 'text-violet-400/90'
          )}
          aria-hidden
        />
        <span className="text-sm font-medium text-zinc-100">{meta.shortLabel}</span>
      </span>
      <span className="line-clamp-2 pl-6 text-[11px] leading-snug text-zinc-500">{meta.description}</span>
    </button>
  )
}

export function JournalAiPanel({
  journalDate,
  formId = 'journal-entry-form',
  className,
}: {
  journalDate?: string
  formId?: string
  className?: string
}) {
  const [mode, setMode] = useState<JournalAiModeId>('clarity')
  const [extraText, setExtraText] = useState('')
  const [standaloneSnapshot, setStandaloneSnapshot] = useState({
    accomplished: '',
    what_failed: '',
    intentions_tomorrow: '',
  })
  const [cashAvailable, setCashAvailable] = useState('')
  const [cashExpected, setCashExpected] = useState('')
  const [cashNeed, setCashNeed] = useState('')
  const [deadlineHours, setDeadlineHours] = useState('')
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksMessage, setTasksMessage] = useState<string | null>(null)

  const meta = useMemo(() => JOURNAL_AI_MODES.find((m) => m.id === mode), [mode])

  const run = useCallback(async () => {
    setError(null)
    setMarkdown(null)
    setTasksMessage(null)
    setLoading(true)
    try {
      let entrySnapshot: EntrySnapshot | undefined

      if (journalDate && formId) {
        const fromForm = readSnapshotFromForm(formId)
        if (fromForm) entrySnapshot = fromForm
      } else if (!journalDate) {
        entrySnapshot = {
          accomplished: standaloneSnapshot.accomplished,
          what_failed: standaloneSnapshot.what_failed,
          intentions_tomorrow: standaloneSnapshot.intentions_tomorrow,
        }
      }

      const hasCash =
        cashAvailable.trim() ||
        cashExpected.trim() ||
        cashNeed.trim() ||
        deadlineHours.trim()
      const cashContext = hasCash
        ? {
            cash_available: cashAvailable.trim() || undefined,
            cash_expected: cashExpected.trim() || undefined,
            cash_need: cashNeed.trim() || undefined,
            deadline_hours:
              deadlineHours.trim() !== '' && !Number.isNaN(Number(deadlineHours))
                ? Number(deadlineHours)
                : undefined,
          }
        : undefined

      const res = await fetch('/api/journal/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          journalDate,
          entrySnapshot,
          extraText: extraText.trim() || undefined,
          cashContext,
        }),
      })
      const data = (await res.json()) as { markdown?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erreur')
        return
      }
      if (data.markdown) setMarkdown(data.markdown)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [
    mode,
    journalDate,
    formId,
    extraText,
    standaloneSnapshot,
    cashAvailable,
    cashExpected,
    cashNeed,
    deadlineHours,
  ])

  async function copyOut() {
    if (!markdown) return
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreateTasks() {
    if (!markdown?.trim()) return
    setTasksMessage(null)
    setTasksLoading(true)
    try {
      const result = await createTasksFromJournalAnalysis(markdown)
      if ('error' in result) {
        setTasksMessage(result.error)
        return
      }
      setTasksMessage(`${result.count} tâche créée(s) — voir Tâches.`)
    } catch (e) {
      setTasksMessage(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setTasksLoading(false)
    }
  }

  const showExtra = meta?.needsExtraText
  const showStandaloneFields =
    !journalDate &&
    meta?.usesEntrySnapshot &&
    [
      'urgent',
      'clarity',
      'progress',
      'evening',
      'action_plan',
      'reframe',
    ].includes(mode)

  return (
    <section
      className={cn(
        'rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-zinc-950/90 p-5 sm:p-6',
        className
      )}
      aria-labelledby="journal-ai-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="journal-ai-title" className="playfair-serif text-xl font-semibold text-zinc-50">
              Assistant exécution
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Orienté résultats : actions numérotées, score d’exécution, option trésorerie. Pas de blabla
              « réfléchir à… ».
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode('urgent')}
          className="shrink-0 gap-1.5 rounded-xl border-amber-600/50 bg-amber-950/30 text-amber-100 hover:bg-amber-950/50"
        >
          <Flame className="h-4 w-4" aria-hidden />
          Mode urgence
        </Button>
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Trésorerie & urgence (optionnel)
        </p>
        <p className="text-xs text-zinc-600">
          Renseigne ce que tu connais : l’IA structure **Situation cash** + plan d’actions (sans inventer tes
          montants).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] text-zinc-500">Cash dispo</span>
            <input
              value={cashAvailable}
              onChange={(e) => setCashAvailable(e.target.value)}
              placeholder="ex. 0 €, 2 400 €…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-zinc-500">Cash attendu (court terme)</span>
            <input
              value={cashExpected}
              onChange={(e) => setCashExpected(e.target.value)}
              placeholder="Relances, encaissements…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-zinc-500">Besoin / écart</span>
            <input
              value={cashNeed}
              onChange={(e) => setCashNeed(e.target.value)}
              placeholder="ex. 1 000 €"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-zinc-500">Délai (heures)</span>
            <input
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(e.target.value)}
              placeholder="ex. 24"
              inputMode="numeric"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="journal-ai-mode" className="sr-only">
          Mode d&apos;analyse
        </label>
        <select
          id="journal-ai-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as JournalAiModeId)}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-600 sm:hidden"
        >
          {JOURNAL_AI_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>

        <div className="hidden max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid lg:grid-cols-3">
          {JOURNAL_AI_MODES.map((m) => (
            <ModeCard key={m.id} meta={m} selected={mode === m.id} onSelect={() => setMode(m.id)} />
          ))}
        </div>
      </div>

      {showStandaloneFields ? (
        <div className="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs font-medium text-zinc-400">
            Colle ou rédige ton journal ici (page liste — pas de formulaire du jour).
          </p>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">Accompli</span>
            <textarea
              value={standaloneSnapshot.accomplished}
              onChange={(e) =>
                setStandaloneSnapshot((s) => ({ ...s, accomplished: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">Ce qui n’a pas marché</span>
            <textarea
              value={standaloneSnapshot.what_failed}
              onChange={(e) =>
                setStandaloneSnapshot((s) => ({ ...s, what_failed: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">Intentions demain</span>
            <textarea
              value={standaloneSnapshot.intentions_tomorrow}
              onChange={(e) =>
                setStandaloneSnapshot((s) => ({ ...s, intentions_tomorrow: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        </div>
      ) : null}

      {showExtra ? (
        <label className="mt-5 block space-y-2">
          <span className="text-sm font-medium text-zinc-200">
            {mode === 'ceo'
              ? 'Ta situation actuelle (business / cash / équipe)'
              : mode === 'unblock'
                ? 'Sur quoi tu es bloqué'
                : 'Ta décision ou le contexte'}
          </span>
          <textarea
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
            rows={5}
            placeholder="Détaille le contexte en phrases concrètes (montants, délais, noms si tu veux)…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-700/50 focus:outline-none"
          />
        </label>
      ) : null}

      {journalDate ? (
        <p className="mt-4 text-xs text-zinc-500">
          Les modes basés sur ton entrée utilisent le formulaire ci-dessus (même non enregistré). Le bloc cash
          s’ajoute à tous les modes.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="rounded-xl bg-violet-600 text-white hover:bg-violet-500"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyse…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Lancer l&apos;analyse
            </>
          )}
        </Button>
        {markdown ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyOut()}
              className="rounded-xl border-zinc-700"
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-400" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tasksLoading}
              onClick={() => void handleCreateTasks()}
              className="gap-1.5 rounded-xl border-emerald-800/60 bg-emerald-950/20 text-emerald-100 hover:bg-emerald-950/40"
            >
              {tasksLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ListTodo className="h-4 w-4" />
              )}
              Créer tâches
            </Button>
          </>
        ) : null}
      </div>

      {tasksMessage ? (
        <p
          className={cn(
            'mt-3 flex flex-wrap items-center gap-x-2 text-sm',
            tasksMessage.includes('créée') ? 'text-emerald-400' : 'text-amber-400'
          )}
          role="status"
        >
          <span>{tasksMessage}</span>
          {tasksMessage.includes('créée') ? (
            <Link href="/app/tasks" className="text-emerald-300 underline underline-offset-2 hover:text-white">
              Ouvrir Tâches
            </Link>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {markdown ? (
        <article className="mt-6 rounded-xl border border-zinc-800/90 bg-zinc-950/40 p-3 sm:p-4">
          <JournalMarkdownLite source={markdown} />
        </article>
      ) : null}
    </section>
  )
}
