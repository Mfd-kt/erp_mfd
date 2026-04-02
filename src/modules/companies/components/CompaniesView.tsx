'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { CompanyDrawer } from './CompanyDrawer'
import { deleteCompany } from '../actions'
import type { Company } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'

interface CompaniesViewProps {
  groupId: string
  companies: Company[]
  canManage: boolean
}

export function CompaniesView({ groupId, companies, canManage }: CompaniesViewProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  function openCreate() {
    setEditingCompany(null)
    setDrawerOpen(true)
  }

  function openEdit(c: Company) {
    setEditingCompany(c)
    setDrawerOpen(true)
  }

  function onSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Sociétés du groupe"
        subtitle="Gestion des entités légales"
        action={canManage ? { label: 'Nouvelle société', onClick: openCreate } : undefined}
        canManage={canManage}
      />

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">
            {companies.length} sociétés
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <EmptyState
              title="Aucune société"
              description="Ajoutez les sociétés du groupe (FR, TN, US…)."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Raison sociale', 'Nom commercial', 'Type', 'Pays', 'Devise', 'Fuseau horaire', 'Statut'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                  {canManage && (
                    <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3 w-24">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-100">{c.legal_name}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.trade_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {(c as { type?: string }).type === 'personal' ? (
                        <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400">Personnel</Badge>
                      ) : (
                        <span className="text-zinc-500 text-xs">Professionnel</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-zinc-300">{c.country_code}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{c.default_currency}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{c.timezone}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {c.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <DeleteButton
                            description="Cette société et toutes ses données (dettes, comptes, etc.) seront supprimées."
                            onConfirm={() => deleteCompany(groupId, c.id)}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <CompanyDrawer
        groupId={groupId}
        company={editingCompany}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={onSuccess}
      />
    </div>
  )
}
