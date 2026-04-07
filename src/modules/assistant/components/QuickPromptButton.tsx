'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createConversationWithPrompt } from '../actions'
import { Loader2 } from 'lucide-react'

interface QuickPromptButtonProps {
  /** Texte envoyé au modèle (peut être long). */
  prompt: string
  /** Libellé court sur le bouton (sinon = prompt). */
  label?: string
}

export function QuickPromptButton({ prompt, label }: QuickPromptButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const { conversationId } = await createConversationWithPrompt(prompt)
      router.push(`/app/assistant/${conversationId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="h-auto max-w-full whitespace-normal py-2 text-left text-xs leading-snug sm:text-sm"
    >
      {loading ? <Loader2 size={14} className="animate-spin shrink-0" /> : (label ?? prompt)}
    </Button>
  )
}
