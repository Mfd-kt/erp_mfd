'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { RevenueStatusBadge } from './RevenueStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { RevenueRow } from '../queries'
import type { RevenueStatus } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'
import { deleteRevenue } from '../actions'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

interface RevenueTableProps {
  companyId: string
  revenues: RevenueRow[]
  defaultCurrency: string
  canManage: boolean
  onEdit: (revenue: RevenueRow) => void
  onSuccess: () => void
  onCreate?: () => void
}

function getCategoryLabel(category: string) {
  if (category === 'client') return 'Client'
  if (category === 'goods_sale') return 'Vente de bien'
  return 'Autre'
}

export function RevenueTable({ companyId, revenues, canManage, onEdit, onSuccess, onCreate }: RevenueTableProps) {
  if (!revenues.length) {
    return (
      <EmptyState
        title="Aucun revenu"
        description="Commence par créer un premier revenu pour suivre les encaissements attendus et reçus."
        actionLabel={canManage ? 'Créer un revenu' : undefined}
        onAction={canManage ? onCreate : undefined}
      />
    )
  }

  const grouped = revenues.reduce<Record<string, RevenueRow[]>>((acc, rev) => {
    const key = rev.revenue_clients?.name ?? 'Sans client'
    if (!acc[key]) acc[key] = []
    acc[key].push(rev)
    return acc
  }, {})

  const groups = Object.entries(grouped)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/70">
            {['Titre', 'Client', 'Catégorie', 'Source', 'Attendu', 'Reçu', 'Restant', 'Date attendue', 'Date reçue', 'Statut'].map((h) => (
              <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {h}
              </th>
            ))}
            {canManage && <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {groups.map(([clientLabel, rows]) => {
            const totalExpected = rows.reduce((sum, row) => sum + Number(row.amount_expected), 0)
            const totalReceived = rows.reduce((sum, row) => sum + Number(row.amount_received), 0)
            return (
              <Fragment key={clientLabel}>
                <tr className="bg-zinc-900/60">
                  <td
                    colSpan={canManage ? 11 : 10}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300"
                  >
                    {clientLabel} · Projection attendue {formatCurrency(totalExpected, rows[0].currency_code)} · Reçu{' '}
                    {formatCurrency(totalReceived, rows[0].currency_code)}
                  </td>
                </tr>
                {rows.map((rev) => {
                  const status = rev.computed_status as RevenueStatus
                  const expected = Number(rev.amount_expected)
                  const received = Number(rev.amount_received)
                  const remaining = Math.max(0, expected - received)
                  const isReceived = status === 'received'
                  return (
                    <tr key={rev.id} className={`transition-colors hover:bg-zinc-900/70 ${isReceived ? 'opacity-75' : ''}`}>
                      <td className="px-4 py-4">
                        <Link href={`/app/${companyId}/revenues/${rev.id}`} className="font-medium text-zinc-100 transition-colors hover:text-white">
                          {rev.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-zinc-400">{rev.revenue_clients?.name ?? '—'}</td>
                      <td className="px-4 py-4 text-zinc-400">{getCategoryLabel(rev.revenue_category)}</td>
                      <td className="px-4 py-4 text-zinc-400">{rev.source_name ?? '—'}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{formatCurrency(expected, rev.currency_code)}</td>
                      <td className="px-4 py-4 text-right font-mono text-emerald-400">{formatCurrency(received, rev.currency_code)}</td>
                      <td className="px-4 py-4 text-right font-mono font-semibold text-white">{formatCurrency(remaining, rev.currency_code)}</td>
                      <td className="px-4 py-4 text-zinc-400">{formatDate(rev.expected_date)}</td>
                      <td className="px-4 py-4 text-zinc-400">{formatDate(rev.received_date)}</td>
                      <td className="px-4 py-4"><RevenueStatusBadge status={status} /></td>
                      {canManage && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {status !== 'received' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                                render={<Link href={`/app/${companyId}/revenues/${rev.id}?action=receive`} />}
                              >
                                Encaisser
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => onEdit(rev)}>
                              <Pencil size={14} />
                              <span className="sr-only">Modifier</span>
                            </Button>
                            {status !== 'received' && Number(rev.amount_received) === 0 && (
                              <DeleteButton
                                description="Supprimer ce revenu ?"
                                onConfirm={async () => {
                                  await deleteRevenue(companyId, rev.id)
                                  onSuccess()
                                }}
                              />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
