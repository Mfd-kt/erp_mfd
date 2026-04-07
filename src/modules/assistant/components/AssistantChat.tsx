'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { sendMessage } from '../actions'
import { Loader2, Send, Sparkles, User } from 'lucide-react'
import { JournalMarkdownLite } from '@/modules/daily-journal/components/journal-markdown-lite'
import { cn } from '@/lib/utils'

interface AssistantChatProps {
  conversationId: string
  messages: { role: string; content: string }[]
  scopeType?: string
  /** Dans une carte avec en-tête séparé : pas de cadre complet autour du chat. */
  shell?: 'standalone' | 'embedded'
}

export function AssistantChat({
  conversationId,
  messages,
  scopeType = 'global',
  shell = 'standalone',
}: AssistantChatProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, loading])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true)
    try {
      await sendMessage(conversationId, input.trim(), scopeType as 'global' | 'business' | 'personal')
      setInput('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-[min(72vh,640px)] max-h-[calc(100vh-11rem)] flex-col overflow-hidden bg-gradient-to-b from-zinc-950/90 via-zinc-950 to-black/40 shadow-inner shadow-black/40',
        shell === 'standalone'
          ? 'rounded-2xl border border-zinc-800/90'
          : 'rounded-b-2xl border-t border-zinc-800/70'
      )}
    >
      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6 [scrollbar-width:thin] [scrollbar-color:rgb(63_63_70/0.7)_transparent]"
      >
        {messages.length === 0 && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-2 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-950/40">
              <Sparkles className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Par où commencer ?</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Décris ta situation, ton objectif ou ton doute — le copilote combine analyse, risques et plan
                d&apos;action. Tu peux aussi repartir des prompts sur la page d&apos;accueil.
              </p>
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          return (
            <div
              key={i}
              className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs',
                  isUser
                    ? 'border-amber-500/35 bg-amber-500/15 text-amber-200'
                    : 'border-zinc-700/80 bg-zinc-900/80 text-amber-300/90'
                )}
                aria-hidden
              >
                {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
              </div>
              <div
                className={cn(
                  'min-w-0 max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 shadow-sm',
                  isUser
                    ? 'rounded-br-md border border-amber-500/25 bg-gradient-to-br from-amber-500/15 to-amber-950/20 text-amber-50'
                    : 'rounded-bl-md border border-zinc-700/50 bg-zinc-900/55 text-zinc-100 backdrop-blur-sm'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-amber-50/95">{m.content}</p>
                ) : (
                  <JournalMarkdownLite source={m.content} variant="compact" className="text-[13px]" />
                )}
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/80 text-amber-300/90">
              <Sparkles className="h-4 w-4 animate-pulse" strokeWidth={1.5} />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-700/50 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500/80" />
              Réflexion en cours…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800/90 bg-zinc-950/95 px-3 py-4 backdrop-blur-md sm:px-5"
      >
        <div className="mx-auto flex max-w-4xl items-end gap-3">
          <label className="sr-only" htmlFor="copilot-input">
            Message au copilote
          </label>
          <textarea
            id="copilot-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ex. : je dois trancher entre X et Y, aide-moi avec risques et plan… (Entrée pour envoyer, Maj+Entrée pour la ligne)"
            disabled={loading}
            className="min-h-[3rem] flex-1 resize-none rounded-xl border border-zinc-700/90 bg-zinc-900/80 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-11 w-11 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
            aria-label="Envoyer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </form>
    </div>
  )
}
