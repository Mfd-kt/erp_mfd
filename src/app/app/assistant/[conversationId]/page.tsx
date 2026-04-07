import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConversationById, getMessages } from '@/modules/assistant/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AssistantChat } from '@/modules/assistant/components/AssistantChat'
import { AssistantContextPanel } from '@/modules/assistant/components/AssistantContextPanel'
import { PendingConfirmationsBanner } from '@/modules/assistant/components/PendingConfirmationsBanner'
import { ConversationTitleEditable } from '@/modules/assistant/components/ConversationTitleEditable'
import { ArrowLeft } from 'lucide-react'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [conversation, messages] = await Promise.all([
    getConversationById(supabase, conversationId, user.id),
    getMessages(supabase, conversationId),
  ])

  if (!conversation) notFound()

  const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  return (
    <div className="space-y-6">
      <Link
        href="/app/assistant"
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-transparent px-1 py-0.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-800 hover:bg-zinc-900/50 hover:text-amber-400/95"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Retour au copilote
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <ConversationTitleEditable conversationId={conversationId} title={conversation.title} />
          <p className="page-hero-subtitle mt-1">
            {conversation.scope_type} · Dernière activité :{' '}
            {conversation.last_message_at
              ? new Date(conversation.last_message_at).toLocaleString('fr-FR')
              : '—'}
          </p>
        </div>
      </div>

      <PendingConfirmationsBanner />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950 shadow-none">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">
              Conversation
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Messages structurés (titres, listes) pour une lecture plus claire.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <AssistantChat
              conversationId={conversationId}
              messages={chatMessages}
              scopeType={conversation.scope_type}
              shell="embedded"
            />
          </CardContent>
        </Card>
        <AssistantContextPanel conversationId={conversationId} />
      </div>
    </div>
  )
}
