import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { getMemories } from '@/modules/assistant/queries'
import { MemoryList } from '@/modules/assistant/components/MemoryList'

const SOURCE_LABELS: Record<string, string> = {
  explicit_feedback: 'Retour explicite',
  behavior: 'Comportement',
  system_rule: 'Règle système',
}

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { source } = await searchParams
  const validSource = source && ['explicit_feedback', 'behavior', 'system_rule'].includes(source)
    ? (source as 'explicit_feedback' | 'behavior' | 'system_rule')
    : undefined

  const memories = await getMemories(supabase, user.id, validSource ? { source: validSource } : undefined)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Mémoire du copilote"
        subtitle="Préférences et règles apprises. Contrôlez ce que l'assistant retient."
      />

      <SectionBlock
        title="Mémoires"
        subtitle="Liste, modification et suppression des entrées de mémoire. Source : explicit_feedback (retour utilisateur), behavior (comportement observé), system_rule (règle système)."
      >
        <MemoryList
          memories={memories}
          sourceFilter={validSource}
          sourceLabels={SOURCE_LABELS}
        />
      </SectionBlock>

      <p className="text-sm text-zinc-500">
        <Link href="/app/assistant" className="hover:text-zinc-300">← Retour au copilote</Link>
      </p>
    </div>
  )
}
