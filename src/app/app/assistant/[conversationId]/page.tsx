import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConversationById, getMessages } from '@/modules/assistant/queries'
import { SectionBlock } from '@/components/ui/section-block'
import { AssistantChat } from '@/modules/assistant/components/AssistantChat'
import { AssistantContextPanel } from '@/modules/assistant/components/AssistantContextPanel'
import { PendingConfirmationsBanner } from '@/modules/assistant/components/PendingConfirmationsBanner'
import { ConversationTitleEditable } from '@/modules/assistant/components/ConversationTitleEditable'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [conversation, messages] = await Promise.all([
    getConversationById(supabase, conversationId, user.id),
    getMessages(supabase, conversationId),
  ])

  if (!conversation) notFound()

  const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <ConversationTitleEditable
            conversationId={conversationId}
            title={conversation.title}
          />
          <p className="page-hero-subtitle mt-1">
            {conversation.scope_type} · Dernière activité:{' '}
            {conversation.last_message_at
              ? new Date(conversation.last_message_at).toLocaleString('fr-FR')
              : '—'}
          </p>
        </div>
      </div>

      <PendingConfirmationsBanner />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <SectionBlock title="Conversation" subtitle="Échangez avec le copilote.">
          <AssistantChat
            conversationId={conversationId}
            messages={chatMessages}
            scopeType={conversation.scope_type}
          />
        </SectionBlock>
        <AssistantContextPanel conversationId={conversationId} />
      </div>

      <p className="text-sm text-zinc-500">
        <Link href="/app/assistant" className="hover:text-zinc-300">← Retour au copilote</Link>
      </p>
    </div>
  )
}
