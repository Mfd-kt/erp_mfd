'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { RecurringFrequencyBadge } from './RecurringFrequencyBadge'
import type { RecurringRuleRow } from '../types'
import type { FrequencyType } from '@/lib/supabase/types'
import { Pencil } from 'lucide-react'
import { deleteRecurringRule, runRecurringNow } from '../actions'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

function getDisplayedNextDate(startDate: string, nextRunDate: string) {
  return nextRunDate < startDate ? startDate : nextRunDate
}

interface RecurringRuleTableProps {
  companyId: string
  rules: RecurringRuleRow[]
  defaultCurrency: string
  canManage: boolean
  onEdit: (rule: RecurringRuleRow) => void
  onSuccess: () => void
  onCreate?: () => void
}

export function RecurringRuleTable({ companyId, rules, defaultCurrency, canManage, onEdit, onSuccess, onCreate }: RecurringRuleTableProps) {
  if (!rules.length) {
    return (
      <EmptyState
        title="Aucune règle récurrente"
        description="Automatise tes charges récurrentes en créant une règle avec fréquence, montant et prochaine exécution."
        actionLabel={canManage ? 'Créer une règle' : undefined}
        onAction={canManage ? onCreate : undefined}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/70">
            {['Titre', 'Créancier', 'Catégorie', 'Montant', 'Fréquence', 'Prochaine échéance', 'Actif', 'Auto'].map((h) => (
              <th key={h} className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{h}</th>
            ))}
            {canManage && <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {rules.map((rule) => (
            <tr key={rule.id} className="transition-colors hover:bg-zinc-900/70">
              <td className="px-4 py-4 font-medium text-zinc-100">{rule.title}</td>
              <td className="px-4 py-4 text-zinc-400">{rule.creditors?.name ?? '—'}</td>
              <td className="px-4 py-4 text-zinc-400">{rule.debt_categories?.name ?? '—'}</td>
              <td className="px-4 py-4 text-right font-mono text-zinc-300">{formatCurrency(Number(rule.amount), rule.currency_code || defaultCurrency)}</td>
              <td className="px-4 py-4"><RecurringFrequencyBadge frequency={rule.frequency as FrequencyType} /></td>
              <td className="px-4 py-4 font-medium text-zinc-200">
                {formatDate(getDisplayedNextDate(rule.start_date, rule.next_run_date))}
              </td>
              <td className="px-4 py-4">
                {rule.is_active ? <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300">Actif</Badge> : <Badge variant="outline" className="border-zinc-700 text-zinc-400">Inactif</Badge>}
              </td>
              <td className="px-4 py-4 text-zinc-400">{rule.auto_generate ? 'Oui' : 'Non'}</td>
              {canManage && (
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                          onClick={async () => {
                            await runRecurringNow(companyId)
                            onSuccess()
                          }}
                        >
                          Exécuter maintenant
                        </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={() => onEdit(rule)}>
                      <Pencil size={14} />
                      <span className="sr-only">Modifier</span>
                    </Button>
                    <DeleteButton
                      description="Supprimer cette règle récurrente ? Les dettes déjà générées ne sont pas supprimées."
                      onConfirm={async () => {
                        await deleteRecurringRule(companyId, rule.id)
                        onSuccess()
                      }}
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
