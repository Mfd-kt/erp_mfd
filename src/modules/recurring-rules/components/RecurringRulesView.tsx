'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import { Badge } from '@/components/ui/badge'
import { KPI_EXPLAIN } from '@/lib/kpi-calculation-explanations'
import { RecurringRulesFilters } from './RecurringRulesFilters'
import { RecurringRuleTable } from './RecurringRuleTable'
import { RecurringRuleDrawer } from './RecurringRuleDrawer'
import { RunRecurringNowButton } from './RunRecurringNowButton'
import type { RecurringRuleRow } from '../types'
import type { Company, Creditor, DebtCategory, DebtType } from '@/lib/supabase/types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

interface RecurringRulesViewProps {
  companyId: string
  company: Company
  rules: RecurringRuleRow[]
  creditors: Creditor[]
  debtCategories: DebtCategory[]
  debtTypes: DebtType[]
  canManage: boolean
}

export function RecurringRulesView({
  companyId,
  company,
  rules,
  creditors,
  debtCategories,
  debtTypes,
  canManage,
}: RecurringRulesViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringRuleRow | null>(null)

  const activeCount = rules.filter((r) => r.is_active).length
  const autoCount = rules.filter((r) => r.auto_generate).length
  const defaultCurrency = company.default_currency
  const monthlyActive = rules.filter((r) => r.frequency === 'monthly' && r.is_active)
  const monthlyRecurringTotal = monthlyActive
    .filter((r) => r.currency_code === defaultCurrency)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const monthlyOtherCurrencyCount = monthlyActive.filter((r) => r.currency_code !== defaultCurrency).length
  const activeCategoryId = searchParams?.get('debt_category_id') ?? ''
  const activeCategory = debtCategories.find((c) => c.id === activeCategoryId)

  function openCreate() {
    setEditingRule(null)
    setDrawerOpen(true)
  }

  function openEdit(rule: RecurringRuleRow) {
    setEditingRule(rule)
    setDrawerOpen(true)
  }

  function onSuccess() {
    setDrawerOpen(false)
    setEditingRule(null)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Règles récurrentes"
        subtitle={`${company.trade_name ?? company.legal_name} · Automatisation des dépenses récurrentes et de leur génération.`}
        explain={KPI_EXPLAIN.pageRecurringRules()}
        rightSlot={
          canManage ? (
            <div className="flex items-center gap-3">
              <RunRecurringNowButton companyId={companyId} onSuccess={onSuccess} />
              <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">Nouvelle règle</Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Règles" value={String(rules.length)} tone="neutral" explain={KPI_EXPLAIN.recurringRulesTotal()} />
        <MetricCard label="Actives" value={String(activeCount)} tone="positive" explain={KPI_EXPLAIN.recurringRulesActiveCount()} />
        <MetricCard label="Auto-générées" value={String(autoCount)} tone="info" explain={KPI_EXPLAIN.recurringRulesAutoGen()} />
        <MetricCard
          label="Récurrent mensuel"
          value={formatCurrency(monthlyRecurringTotal, defaultCurrency)}
          tone="neutral"
          helper={
            monthlyOtherCurrencyCount > 0
              ? `${monthlyOtherCurrencyCount} règle(s) mensuelle(s) active(s) dans une autre devise — hors total ci-dessus.`
              : undefined
          }
          explain={KPI_EXPLAIN.recurringRulesMonthlyAmount()}
        />
      </div>

      <SectionBlock title="Filtres" subtitle="Filtrer par fréquence, statut et mode de génération." explain={KPI_EXPLAIN.pageRecurringRules()}>
        <Suspense fallback={<div className="h-10 rounded-xl bg-zinc-900 animate-pulse" />}>
          <RecurringRulesFilters debtCategories={debtCategories} />
        </Suspense>
      </SectionBlock>

      <SectionBlock
        title="Règles"
        subtitle="Fréquence, prochaine exécution et état d'automatisation visibles immédiatement."
        explain={KPI_EXPLAIN.pageRecurringRules()}
      >
        {activeCategory ? (
          <div className="mb-4">
            <Badge variant="secondary" className="bg-blue-500/15 text-blue-300">
              Catégorie active: {activeCategory.name}
            </Badge>
          </div>
        ) : null}
        <RecurringRuleTable companyId={companyId} rules={rules} defaultCurrency={company.default_currency} canManage={canManage} onEdit={openEdit} onSuccess={onSuccess} onCreate={openCreate} />
      </SectionBlock>

      <RecurringRuleDrawer
        companyId={companyId}
        rule={editingRule}
        creditors={creditors}
        debtCategories={debtCategories}
        debtTypes={debtTypes}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={onSuccess}
      />
    </div>
  )
}
