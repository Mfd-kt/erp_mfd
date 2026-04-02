'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { RevenueStatusBadge } from './RevenueStatusBadge'
import { RevenueDrawer } from './RevenueDrawer'
import { ReceiveRevenueDrawer } from './ReceiveRevenueDrawer'
import type { RevenueRow } from '../queries'
import type { Company, AccountWithBalance, RevenueClient } from '@/lib/supabase/types'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

function getCategoryLabel(category: string) {
  if (category === 'client') return 'Client'
  if (category === 'goods_sale') return 'Vente de bien'
  return 'Autre'
}

interface RevenueDetailViewProps {
  companyId: string
  company: Company
  revenue: RevenueRow
  revenueClients: RevenueClient[]
  accounts: AccountWithBalance[]
  canManage: boolean
  initialOpenReceive?: boolean
}

export function RevenueDetailView({
  companyId,
  company,
  revenue,
  revenueClients,
  accounts,
  canManage,
  initialOpenReceive = false,
}: RevenueDetailViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [receiveDrawerOpen, setReceiveDrawerOpen] = useState(initialOpenReceive)

  const expected = Number(revenue.amount_expected) || 0
  const received = Number(revenue.amount_received) || 0
  const isFullyReceived = revenue.computed_status === 'received'
  const accountName = (revenue as RevenueRow & { accounts?: { name: string } | null }).accounts?.name ?? (revenue as RevenueRow & { account?: { name: string } | null }).account?.name

  function onSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white" asChild>
          <Link href={`/app/${companyId}/revenues`}>
            <ArrowLeft size={18} />
            <span className="sr-only">Retour aux revenus</span>
          </Link>
        </Button>
        <HeroPageHeader
          title={revenue.title}
          subtitle={`${company.trade_name ?? company.legal_name} · Vision complète du pipeline, du statut et de l’encaissement.`}
          rightSlot={canManage ? <Button className="bg-white text-zinc-950 hover:bg-zinc-200" onClick={() => setDrawerOpen(true)}>Modifier le revenu</Button> : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Attendu" value={formatCurrency(expected, revenue.currency_code)} tone="info" />
        <MetricCard label="Reçu" value={formatCurrency(received, revenue.currency_code)} tone="positive" />
        <MetricCard label="Restant" value={formatCurrency(Math.max(0, expected - received), revenue.currency_code)} tone={isFullyReceived ? 'neutral' : 'warning'} />
      </div>

      <SectionBlock title="Résumé" subtitle="Source, statut et jalons d’encaissement regroupés proprement.">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm md:grid-cols-2">
          <div>
            <p className="section-label mb-1">Source</p>
            <p className="text-zinc-100">{revenue.source_name ?? '—'}</p>
          </div>
          <div>
            <p className="section-label mb-1">Client</p>
            <p className="text-zinc-100">{revenue.revenue_clients?.name ?? '—'}</p>
          </div>
          <div>
            <p className="section-label mb-1">Catégorie</p>
            <p className="text-zinc-100">{getCategoryLabel(revenue.revenue_category)}</p>
          </div>
          <div>
            <p className="section-label mb-1">Statut</p>
            <RevenueStatusBadge status={revenue.computed_status} />
          </div>
          <div>
            <p className="section-label mb-1">Date attendue</p>
            <p className="text-zinc-100">{formatDate(revenue.expected_date)}</p>
          </div>
          <div>
            <p className="section-label mb-1">Date reçue</p>
            <p className="text-zinc-100">{formatDate(revenue.received_date)}</p>
          </div>
          {isFullyReceived && accountName ? (
            <div>
              <p className="section-label mb-1">Compte</p>
              <p className="text-zinc-100">{accountName}</p>
            </div>
          ) : null}
        </div>
        {revenue.notes ? (
          <div className="mt-6 border-t border-zinc-800/70 pt-4">
            <p className="section-label mb-2">Notes</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{revenue.notes}</p>
          </div>
        ) : null}
      </SectionBlock>

      {canManage && !isFullyReceived ? (
        <SectionBlock title="Encaissement" subtitle="Action rapide pour enregistrer la réception réelle.">
          <Button
            size="sm"
            className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200"
            onClick={() => setReceiveDrawerOpen(true)}
          >
            <Plus size={14} />
            Enregistrer une réception
          </Button>
        </SectionBlock>
      ) : null}

      <RevenueDrawer
        companyId={companyId}
        revenue={revenue}
        revenueClients={revenueClients}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={onSuccess}
      />

      <ReceiveRevenueDrawer
        companyId={companyId}
        revenueId={revenue.id}
        amountExpected={expected}
        currency={revenue.currency_code}
        accounts={accounts}
        open={receiveDrawerOpen}
        onOpenChange={setReceiveDrawerOpen}
        onSuccess={onSuccess}
      />
    </div>
  )
}
