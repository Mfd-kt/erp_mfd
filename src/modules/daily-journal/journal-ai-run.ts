import OpenAI from 'openai'
import type { JournalAiModeId } from './journal-ai-modes'
import {
  buildJournalAiSystemPrompt,
  buildJournalAiUserContent,
  type CashContextInput,
} from './journal-ai-context'

export class JournalAiError extends Error {
  constructor(
    public code: 'CONFIG' | 'VALIDATION' | 'API',
    message: string
  ) {
    super(message)
    this.name = 'JournalAiError'
  }
}

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new JournalAiError('CONFIG', 'OPENAI_API_KEY non configuré côté serveur.')
  return new OpenAI({ apiKey: key })
}

function temperatureFor(mode: JournalAiModeId): number {
  if (mode === 'patterns' || mode === 'vision') return 0.32
  if (mode === 'month_synthesis') return 0.36
  if (mode === 'urgent' || mode === 'ceo' || mode === 'decision') return 0.38
  if (mode === 'action_plan' || mode === 'evening') return 0.45
  return 0.5
}

export async function runJournalAiCompletion(args: {
  mode: JournalAiModeId
  snapshotText?: string
  historyText?: string
  extraText?: string
  journalDate?: string
  cashContext?: CashContextInput
  monthPrefix?: string
}): Promise<string> {
  const system = buildJournalAiSystemPrompt(args.mode)
  const user = buildJournalAiUserContent(args.mode, {
    snapshotText: args.snapshotText,
    historyText: args.historyText,
    extraText: args.extraText,
    journalDate: args.journalDate,
    cashContext: args.cashContext,
    monthPrefix: args.monthPrefix,
  })

  const openai = getOpenAI()
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  try {
    const maxTokens = args.mode === 'month_synthesis' ? 1600 : 4096

    const res = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: temperatureFor(args.mode),
      max_tokens: maxTokens,
    })
    const text = res.choices[0]?.message?.content?.trim()
    if (!text) throw new JournalAiError('API', 'Réponse vide du modèle.')
    return text
  } catch (e) {
    if (e instanceof JournalAiError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new JournalAiError('API', msg)
  }
}

/** Extrait des titres de tâches concrètes depuis une analyse (pour création dans l’app). */
export async function extractTaskTitlesFromMarkdown(markdown: string): Promise<string[]> {
  const openai = getOpenAI()
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  const trimmed = markdown.trim().slice(0, 14000)
  if (!trimmed) return []

  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Tu extrais 3 à 12 titres de tâches TRÈS concrètes (verbes d'action : appeler, envoyer, relancer, etc.) à partir d'un texte d'analyse. Pas de doublons. Pas de numérotation dans le titre. JSON strict : {"tasks":["titre court",...]} — chaque titre ≤ 120 caractères.`,
      },
      { role: 'user', content: trimmed },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.15,
    max_tokens: 800,
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? '{}'
  let parsed: { tasks?: unknown }
  try {
    parsed = JSON.parse(raw) as { tasks?: unknown }
  } catch {
    return []
  }
  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.filter((t): t is string => typeof t === 'string')
    : []
  return tasks
    .map((t) => t.trim().replace(/^\d+[\).\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 12)
}
