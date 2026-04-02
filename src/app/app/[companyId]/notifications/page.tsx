import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Company } from '@/lib/supabase/types'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { markAllNotificationsRead, markNotificationRead } from '@/modules/notifications/actions'
import { Button } from '@/components/ui/button'

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const { companyId } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRaw } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!companyRaw) notFound()
  const company = companyRaw as Company

  let query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (sp.status === 'unread') query = query.eq('is_read', false)
  if (sp.status === 'read') query = query.eq('is_read', true)
  if (sp.type) query = query.eq('type', sp.type)
  const { data: notifications } = await query

  return (
    <div className="space-y-8 fade-in">
      <HeroPageHeader
        title="Notifications"
        subtitle={`${company.trade_name ?? company.legal_name} · Flux in-app des événements et automatisations.`}
        explain={KPI_EXPLAIN.pageNotifications()}
      />
      <SectionBlock title="Centre" subtitle="Notifications filtrables, lisibles et actionnables." explain={KPI_EXPLAIN.pageNotifications()}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <form className="flex flex-wrap items-center gap-3">
            <select name="status" defaultValue={sp.status ?? ''} className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200">
              <option value="">Tous</option>
              <option value="unread">Non lus</option>
              <option value="read">Lus</option>
            </select>
            <select name="type" defaultValue={sp.type ?? ''} className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200">
              <option value="">Tous les types</option>
              <option value="info">Info</option>
              <option value="warning">Avertissement</option>
              <option value="critical">Critique</option>
              <option value="success">Succès</option>
            </select>
            <button type="submit" className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300 transition-colors hover:bg-zinc-800">Filtrer</button>
            <Link href={`/app/${companyId}/notifications`} className="text-sm text-zinc-500 hover:text-zinc-200">Réinitialiser</Link>
          </form>
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">Tout marquer lu</Button>
          </form>
        </div>
        <div className="space-y-3">
          {(notifications ?? []).length === 0 ? <p className="text-sm text-zinc-500">Aucune notification.</p> : (notifications ?? []).map((n: any) => (
            <div key={n.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{n.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{n.message}</p>
                  <p className="mt-2 text-xs text-zinc-500">{formatDate(n.created_at)}</p>
                </div>
                {!n.is_read ? (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <Button type="submit" size="sm" className="bg-white text-zinc-950 hover:bg-zinc-200">Marquer lu</Button>
                  </form>
                ) : <span className="text-xs text-zinc-500">Lu</span>}
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  )
}
