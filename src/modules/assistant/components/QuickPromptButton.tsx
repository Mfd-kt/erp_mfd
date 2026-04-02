'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createConversationWithPrompt } from '../actions'
import { Loader2 } from 'lucide-react'

interface QuickPromptButtonProps {
  prompt: string
}

export function QuickPromptButton({ prompt }: QuickPromptButtonProps) {
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
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : prompt}
    </Button>
  )
}
