'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { AccountDrawer } from './AccountDrawer'
import { AccountBalanceCell } from './AccountBalanceCell'
import { deleteAccount } from '../actions'
import type { AccountWithBalance } from '@/lib/supabase/types'
import type { Company } from '@/lib/supabase/types'
import { Pencil, Search } from 'lucide-react'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

interface AccountsViewProps {
  companyId: string
  company: Company
  accounts: AccountWithBalance[]
  canManage: boolean
  openCreateOnMount?: boolean
}

export function AccountsView({ companyId, company, accounts, canManage, openCreateOnMount = false }: AccountsViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountWithBalance | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (openCreateOnMount && canManage) {
      setEditingAccount(null)
      setDrawerOpen(true)
    }
  }, [openCreateOnMount, canManage])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) => {
      const name = a.name.toLowerCase()
      const type = String(a.account_type).toLowerCase()
      const ccy = a.currency_code.toLowerCase()
      return name.includes(q) || type.includes(q) || ccy.includes(q)
    })
  }, [accounts, query])

  const totalBalance = filtered.reduce((s, a) => s + Number(a.computed_balance ?? a.opening_balance), 0)
  const negativeCount = filtered.filter((a) => Number(a.computed_balance ?? a.opening_balance) < 0).length

  function openCreate() {
    setEditingAccount(null)
    setDrawerOpen(true)
  }

  function openEdit(a: AccountWithBalance) {
    setEditingAccount(a)
    setDrawerOpen(true)
  }

  function onSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Comptes"
        subtitle={`${company.trade_name ?? company.legal_name} · Gestion des soldes, supports et positions de trésorerie.`}
        explain={KPI_EXPLAIN.pageAccounts()}
        rightSlot={canManage ? <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouveau compte</Button> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label="Trésorerie totale"
          value={formatCurrency(totalBalance, company.default_currency)}
          tone={totalBalance < 0 ? 'critical' : 'positive'}
          explain={KPI_EXPLAIN.accountsTotalTreasury()}
        />
        <MetricCard
          label="Comptes actifs"
          value={String(filtered.filter((a) => a.is_active).length)}
          tone="neutral"
          explain={KPI_EXPLAIN.accountsActiveCount()}
        />
        <MetricCard
          label="Soldes négatifs"
          value={String(negativeCount)}
          tone={negativeCount > 0 ? 'critical' : 'neutral'}
          explain={KPI_EXPLAIN.accountsNegativeCount()}
        />
      </div>

      <SectionBlock
        title="Registre des comptes"
        subtitle="Soldes d'ouverture, position actuelle et statut. Recherchez par nom, type ou devise. Solde actuel : cliquez pour réaligner sur votre banque (réconciliation)."
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom, type, devise…)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              aria-label="Filtrer les comptes"
            />
          </div>
          {query ? (
            <p className="text-xs text-zinc-500">
              {filtered.length} / {accounts.length} compte{accounts.length !== 1 ? 's' : ''}
            </p>
          ) : null}
        </div>

        {accounts.length === 0 ? (
          <EmptyState title="Aucun compte" description="Ajoute un premier compte pour suivre ta trésorerie disponible et tes flux." actionLabel={canManage ? 'Créer un compte' : undefined} onAction={canManage ? openCreate : undefined} />
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">Aucun compte ne correspond à « {query} ».</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Nom', 'Type', 'Devise', 'Solde ouverture', 'Solde actuel', 'Statut'].map((h) => (
                    <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {h}
                    </th>
                  ))}
                  {canManage && (
                    <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((a) => {
                  const balance = Number(a.computed_balance ?? a.opening_balance)
                  return (
                    <tr key={a.id} className={`transition-colors hover:bg-zinc-900/70 ${balance < 0 ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-4 font-medium text-zinc-100">
                        <Link
                          href={`/app/${companyId}/accounts/${a.id}`}
                          className="text-amber-400/95 hover:text-amber-300 hover:underline underline-offset-2"
                        >
                          {a.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4 capitalize text-zinc-400">{a.account_type}</td>
                      <td className="px-4 py-4 font-mono text-zinc-300">{a.currency_code}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-400">{formatCurrency(a.opening_balance, a.currency_code)}</td>
                      <td className="px-4 py-4 text-right">
                        <AccountBalanceCell companyId={companyId} account={a} canManage={canManage} onSaved={onSuccess} />
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={a.is_active ? 'secondary' : 'outline'} className={a.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'border-zinc-700 text-zinc-400'}>
                          {a.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => openEdit(a)}>
                              <Pencil size={14} />
                            </Button>
                            <DeleteButton
                              description="Ce compte sera supprimé. Les mouvements restent liés aux dettes/paiements."
                              onConfirm={async () => {
                                await deleteAccount(companyId, a.id)
                                router.refresh()
                              }}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      <AccountDrawer companyId={companyId} account={editingAccount} defaultCurrency={company.default_currency} open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={onSuccess} />
    </div>
  )
}
