import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  getJournalEntries,
  getJournalEntriesForMonthPrefix,
  getJournalEntry,
} from '@/modules/daily-journal/queries'
import type { JournalAiModeId } from '@/modules/daily-journal/journal-ai-modes'
import { getJournalAiMode } from '@/modules/daily-journal/journal-ai-modes'
import {
  formatEntryForPrompt,
  formatSnapshotForPrompt,
  type CashContextInput,
  type EntrySnapshot,
} from '@/modules/daily-journal/journal-ai-context'
import { JournalAiError, runJournalAiCompletion } from '@/modules/daily-journal/journal-ai-run'

const entrySnapshotSchema = z
  .object({
    accomplished: z.string().optional(),
    what_failed: z.string().optional(),
    intentions_tomorrow: z.string().optional(),
    mood: z.coerce.number().min(1).max(5).optional(),
    energy_level: z.string().optional(),
  })
  .optional()

const cashContextSchema = z
  .object({
    cash_available: z.string().max(500).optional(),
    cash_expected: z.string().max(500).optional(),
    cash_need: z.string().max(500).optional(),
    deadline_hours: z.coerce.number().min(0).max(8760).optional(),
  })
  .optional()

const bodySchema = z.object({
  mode: z.enum([
    'month_synthesis',
    'urgent',
    'clarity',
    'patterns',
    'ceo',
    'unblock',
    'progress',
    'reframe',
    'evening',
    'decision',
    'vision',
    'action_plan',
  ]),
  /** Mois complet YYYY-MM — requis pour `month_synthesis`. */
  monthPrefix: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entrySnapshot: entrySnapshotSchema,
  extraText: z.string().max(16000).optional(),
  cashContext: cashContextSchema,
})

function snapshotHasBody(s?: EntrySnapshot): boolean {
  if (!s) return false
  const t = [s.accomplished, s.what_failed, s.intentions_tomorrow]
    .map((x) => x?.trim() ?? '')
    .join(' ')
  return t.length >= 8
}

function extraOk(t?: string): boolean {
  return Boolean(t && t.trim().length >= 15)
}

function buildSnapshotText(
  mode: JournalAiModeId,
  snapshot: EntrySnapshot | undefined,
  serverEntry: Awaited<ReturnType<typeof getJournalEntry>>
): string | undefined {
  if (snapshotHasBody(snapshot)) {
    return formatSnapshotForPrompt(snapshot!)
  }
  if (
    serverEntry &&
    ['clarity', 'progress', 'evening', 'action_plan', 'reframe', 'urgent'].includes(mode)
  ) {
    return formatEntryForPrompt(serverEntry)
  }
  return undefined
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? 'Requête invalide' },
      { status: 400 }
    )
  }

  const { mode, monthPrefix, journalDate, entrySnapshot, extraText, cashContext } = parsed.data
  const userId = user.id

  if (mode === 'month_synthesis') {
    if (!monthPrefix) {
      return NextResponse.json({ error: 'Indique le mois (monthPrefix au format YYYY-MM).' }, { status: 400 })
    }
    let monthRows: Awaited<ReturnType<typeof getJournalEntriesForMonthPrefix>>
    try {
      monthRows = await getJournalEntriesForMonthPrefix(supabase, userId, monthPrefix)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur chargement'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    if (monthRows.length === 0) {
      return NextResponse.json({ error: 'Aucune entrée pour ce mois.' }, { status: 422 })
    }
    const historyText = monthRows.map(formatEntryForPrompt).join('\n\n---\n\n')
    const cashPayload: CashContextInput | undefined = cashContext
      ? {
          cash_available: cashContext.cash_available,
          cash_expected: cashContext.cash_expected,
          cash_need: cashContext.cash_need,
          deadline_hours: cashContext.deadline_hours,
        }
      : undefined
    try {
      const markdown = await runJournalAiCompletion({
        mode: 'month_synthesis',
        historyText,
        monthPrefix,
        cashContext: cashPayload,
      })
      return NextResponse.json({ markdown })
    } catch (e) {
      if (e instanceof JournalAiError && e.code === 'CONFIG') {
        return NextResponse.json({ error: e.message }, { status: 503 })
      }
      const msg = e instanceof Error ? e.message : 'Erreur serveur'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  const meta = getJournalAiMode(mode)
  if (!meta) return NextResponse.json({ error: 'Mode inconnu' }, { status: 400 })

  let serverEntry = null as Awaited<ReturnType<typeof getJournalEntry>>
  if (journalDate) {
    serverEntry = await getJournalEntry(supabase, userId, journalDate)
  }

  const snapshotText = buildSnapshotText(mode, entrySnapshot, serverEntry)

  let historyText: string | undefined
  if (meta.loadsHistory === 'last10') {
    const rows = await getJournalEntries(supabase, userId, 10)
    const chronological = [...rows].reverse()
    if (chronological.length === 0) {
      return NextResponse.json(
        { error: 'Il faut au moins une entrée de journal pour analyser les patterns.' },
        { status: 422 }
      )
    }
    historyText = chronological.map(formatEntryForPrompt).join('\n\n---\n\n')
  } else if (meta.loadsHistory === 'last20') {
    const rows = await getJournalEntries(supabase, userId, 20)
    const chronological = [...rows].reverse()
    if (chronological.length === 0) {
      return NextResponse.json(
        { error: 'Il faut au moins une entrée pour la projection long terme.' },
        { status: 422 }
      )
    }
    historyText = chronological.map(formatEntryForPrompt).join('\n\n---\n\n')
  }

  if (mode === 'ceo' || mode === 'unblock' || mode === 'decision') {
    if (!extraOk(extraText)) {
      return NextResponse.json(
        { error: 'Ajoute un texte suffisamment détaillé (au moins une phrase ou deux).' },
        { status: 422 }
      )
    }
  }

  if (['clarity', 'progress', 'evening', 'action_plan', 'urgent'].includes(mode)) {
    if (!snapshotText?.trim() && !extraOk(extraText)) {
      return NextResponse.json(
        {
          error:
            'Contenu insuffisant : remplis le journal (ou le texte libre) pour lancer ce mode — le bloc cash seul ne suffit pas.',
        },
        { status: 422 }
      )
    }
  }

  if (mode === 'reframe') {
    const wf = entrySnapshot?.what_failed?.trim() ?? serverEntry?.what_failed?.trim()
    if (!extraOk(extraText) && !(wf && wf.length >= 8)) {
      return NextResponse.json(
        {
          error:
            'Pour ce mode, décris tes pensées difficiles (champ dédié ou zone « Ce qui n’a pas marché »).',
        },
        { status: 422 }
      )
    }
  }

  try {
    const cashPayload: CashContextInput | undefined = cashContext
      ? {
          cash_available: cashContext.cash_available,
          cash_expected: cashContext.cash_expected,
          cash_need: cashContext.cash_need,
          deadline_hours: cashContext.deadline_hours,
        }
      : undefined

    const markdown = await runJournalAiCompletion({
      mode,
      snapshotText,
      historyText,
      extraText,
      journalDate,
      cashContext: cashPayload,
    })
    return NextResponse.json({ markdown })
  } catch (e) {
    if (e instanceof JournalAiError && e.code === 'CONFIG') {
      return NextResponse.json({ error: e.message }, { status: 503 })
    }
    const msg = e instanceof Error ? e.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
