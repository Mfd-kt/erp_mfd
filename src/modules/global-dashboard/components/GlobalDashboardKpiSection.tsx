'use client'

import { useState } from 'react'
import { ClickableMetricCard } from '@/modules/group-dashboard/components/ClickableMetricCard'
import { DataExplainDialog } from '@/modules/group-dashboard/components/DataExplainDialog'
import type { GroupExplainPayload } from '@/modules/group-dashboard/types'
import type { GlobalDashboardExplains } from '../build-payloads'
import type { GlobalDashboardData } from '../types'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

const RISK_LABELS = {
  low: 'Faible',
  medium: 'Modéré',
  high: 'Élevé',
  critical: 'Critique',
} as const

export function GlobalDashboardKpiSection({
  data,
  explains,
}: {
  data: GlobalDashboardData
  explains: GlobalDashboardExplains
}) {
  const [explain, setExplain] = useState<GroupExplainPayload | null>(null)
  const base = data.baseCurrency

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ClickableMetricCard
          label="Trésorerie consolidée"
          value={formatCurrency(data.totalCash, base)}
          tone={data.totalCash < 0 ? 'critical' : 'positive'}
          helper="Soldes des comptes actifs"
          explain={explains.cash}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="Obligations ouvertes"
          value={formatCurrency(data.openObligations, base)}
          tone={data.openObligations > 0 ? 'warning' : 'neutral'}
          helper="Dettes restant à payer"
          explain={explains.openObligations}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="À recevoir"
          value={formatCurrency(data.receivables, base)}
          tone="info"
          helper="Revenus attendus non encaissés"
          explain={explains.receivables}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="Clôture projetée"
          value={formatCurrency(data.projectedClosingCash, base)}
          tone={
            data.projectedClosingCash < 0
              ? 'critical'
              : data.projectedClosingCash < data.openObligations
                ? 'warning'
                : 'positive'
          }
          helper={`Sur ${data.periodDays} jours`}
          explain={explains.projectedClosing}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="Niveau de risque"
          value={RISK_LABELS[data.riskLevel]}
          tone={
            data.riskLevel === 'critical'
              ? 'critical'
              : data.riskLevel === 'high'
                ? 'warning'
                : 'neutral'
          }
          explain={explains.risk}
          onOpenExplain={setExplain}
        />
        <ClickableMetricCard
          label="Retrait sécurisé"
          value={formatCurrency(data.safeWithdrawalCapacity, base)}
          tone={data.safeWithdrawalCapacity > 0 ? 'positive' : 'neutral'}
          helper="Après tampon de sécurité"
          explain={explains.safeWithdrawal}
          onOpenExplain={setExplain}
        />
      </div>

      <DataExplainDialog open={explain !== null} onOpenChange={(o) => !o && setExplain(null)} payload={explain} />
    </>
  )
}
