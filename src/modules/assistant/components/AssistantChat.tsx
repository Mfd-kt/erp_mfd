'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { sendMessage } from '../actions'
import { Loader2, Send } from 'lucide-react'

interface AssistantChatProps {
  conversationId: string
  messages: { role: string; content: string }[]
  scopeType?: string
}

export function AssistantChat({ conversationId, messages, scopeType = 'global' }: AssistantChatProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">
            Posez une question ou utilisez un des prompts rapides.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2 ${
                m.role === 'user'
                  ? 'bg-amber-500/20 text-amber-100'
                  : 'bg-zinc-800/80 text-zinc-100'
              }`}
            >
              <pre className="whitespace-pre-wrap text-sm font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre question..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            disabled={loading}
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </form>
    </div>
  )
}
