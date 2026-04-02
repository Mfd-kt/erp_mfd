'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createConversation } from '../actions'
import { Plus, Loader2 } from 'lucide-react'

export function NewConversationButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const { conversationId } = await createConversation('global')
      router.push(`/app/assistant/${conversationId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
      Nouvelle conversation
    </Button>
  )
}
