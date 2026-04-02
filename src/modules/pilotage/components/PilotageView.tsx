import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/ui/metric-card'
import { SectionBlock } from '@/components/ui/section-block'
import type { Company } from '@/lib/supabase/types'
import type { CompanyPilotageData } from '../types'
import { PilotageFilters } from './PilotageFilters'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatPct(value: number | null) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)} %`
}

function severityLabel(severity: 'info' | 'warning' | 'critical') {
  if (severity === 'critical') return 'Critique'
  if (severity === 'warning') return 'Avertissement'
  return 'Info'
}

interface PilotageViewProps {
  company: Company
  data: CompanyPilotageData
  horizonDays: number
}

export function PilotageView({ company, data, horizonDays }: PilotageViewProps) {
  const currency = data.currency
  const assumptions = [
    ...data.projectMargin.assumptions,
    ...data.acquisition.assumptions,
    ...data.breakEven.assumptions,
    ...data.treasuryNeed.assumptions,
  ]

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Pilotage financier"
        subtitle={`${company.trade_name ?? company.legal_name} · Marge chantier, coût client, rentabilité et trésorerie.`}
        rightSlot={<PilotageFilters from={data.range.from} to={data.range.to} horizonDays={horizonDays} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Marge réalisée totale"
          value={formatCurrency(data.projectMargin.totalGrossMarginRealized, currency)}
          tone={data.projectMargin.totalGrossMarginRealized >= 0 ? 'positive' : 'critical'}
        />
        <MetricCard
          label="CAC simplifié"
          value={
            data.acquisition.customerAcquisitionCost == null
              ? '—'
              : formatCurrency(data.acquisition.customerAcquisitionCost, currency)
          }
          tone="info"
        />
        <MetricCard
          label="Seuil de rentabilité"
          value={
            data.breakEven.breakEvenRevenue == null
              ? '—'
              : formatCurrency(data.breakEven.breakEvenRevenue, currency)
          }
          tone="warning"
        />
        <MetricCard
          label={`Besoin trésorerie (${horizonDays}j)`}
          value={formatCurrency(data.treasuryNeed.treasuryNeed, currency)}
          tone={data.treasuryNeed.treasuryNeed > 0 ? 'critical' : 'positive'}
        />
      </div>

      <SectionBlock title="Alertes pilotage" subtitle="Signaux prioritaires sur les 4 axes avec seuils explicites.">
        {data.alerts.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucune alerte sur la base des seuils actuels.</p>
        ) : (
          <ul className="space-y-2">
            {data.alerts.map((alert) => (
              <li key={alert.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-100">{alert.title}</p>
                  <Badge
                    variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                    className={
                      alert.severity === 'warning'
                        ? 'border-amber-600/60 bg-amber-500/15 text-amber-300'
                        : alert.severity === 'critical'
                          ? ''
                          : 'border-zinc-700 text-zinc-300'
                    }
                  >
                    {severityLabel(alert.severity)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{alert.message}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
          <p className="font-medium text-zinc-300">Seuils d'alerte actifs</p>
          <p className="mt-1">
            Marge réalisée: warning &lt; {(data.thresholds.minRealizedMarginRateWarning * 100).toFixed(0)}%, critical &lt; {(data.thresholds.minRealizedMarginRateCritical * 100).toFixed(0)}%.
          </p>
          <p>
            Coût acquisition/revenu: warning &gt; {(data.thresholds.maxAcquisitionCostRatioWarning * 100).toFixed(0)}%, critical &gt; {(data.thresholds.maxAcquisitionCostRatioCritical * 100).toFixed(0)}%.
          </p>
          <p>
            Marge de sécurité: warning &lt; {data.thresholds.minSafetyMarginWarning}, critical &lt; {data.thresholds.minSafetyMarginCritical}.
          </p>
          <p>
            Besoin de trésorerie: warning &gt; {data.thresholds.maxTreasuryNeedWarning}, critical &gt; {data.thresholds.maxTreasuryNeedCritical}.
          </p>
        </div>
      </SectionBlock>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionBlock title="1) Marge par chantier" subtitle="Allocation des coûts PROD au prorata des revenus attendus.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Chantier', 'Attendu', 'Reçu', 'Coût alloué', 'Marge réalisée', 'Taux marge'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.projectMargin.rows.map((row) => (
                  <tr key={row.projectKey}>
                    <td className="px-3 py-3 text-zinc-100">{row.projectKey}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatCurrency(row.revenueExpected, currency)}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatCurrency(row.revenueReceived, currency)}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatCurrency(row.allocatedProductionCosts, currency)}</td>
                    <td className="px-3 py-3 text-zinc-200">{formatCurrency(row.grossMarginRealized, currency)}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatPct(row.marginRateRealized)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>

        <SectionBlock title="2) Coût réel par client" subtitle="Allocation des coûts ACQ au prorata du revenu attendu client.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70">
                  {['Client', 'Attendu', 'Reçu', 'Coût ACQ alloué', 'Ratio coût/réalisé'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.acquisition.rows.map((row) => (
                  <tr key={row.clientKey}>
                    <td className="px-3 py-3 text-zinc-100">{row.clientKey}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatCurrency(row.revenueExpected, currency)}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatCurrency(row.revenueReceived, currency)}</td>
                    <td className="px-3 py-3 text-zinc-200">{formatCurrency(row.allocatedAcquisitionCost, currency)}</td>
                    <td className="px-3 py-3 text-zinc-300">{formatPct(row.realizedCostRatio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionBlock title="3) Seuil de rentabilité" subtitle="Point mort et marge de sécurité sur la période filtrée.">
          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-300">
            <p>Charges fixes: <strong>{formatCurrency(data.breakEven.fixedCosts, currency)}</strong></p>
            <p>Charges variables: <strong>{formatCurrency(data.breakEven.variableCosts, currency)}</strong></p>
            <p>Marge contributive: <strong>{formatCurrency(data.breakEven.contributionMargin, currency)}</strong></p>
            <p>Taux marge contributive: <strong>{formatPct(data.breakEven.contributionMarginRate)}</strong></p>
            <p>CA seuil de rentabilité: <strong>{data.breakEven.breakEvenRevenue == null ? '—' : formatCurrency(data.breakEven.breakEvenRevenue, currency)}</strong></p>
            <p>Marge de sécurité: <strong>{data.breakEven.safetyMargin == null ? '—' : formatCurrency(data.breakEven.safetyMargin, currency)}</strong></p>
          </div>
        </SectionBlock>

        <SectionBlock title="4) Besoin de trésorerie" subtitle="Projection de liquidité sur horizon glissant.">
          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-300">
            <p>Trésorerie d'ouverture: <strong>{formatCurrency(data.treasuryNeed.openingCash, currency)}</strong></p>
            <p>Entrées attendues: <strong>{formatCurrency(data.treasuryNeed.expectedInflows, currency)}</strong></p>
            <p>Sorties attendues: <strong>{formatCurrency(data.treasuryNeed.expectedOutflows, currency)}</strong></p>
            <p>Net projeté: <strong>{formatCurrency(data.treasuryNeed.projectedNet, currency)}</strong></p>
            <p>Besoin de trésorerie: <strong>{formatCurrency(data.treasuryNeed.treasuryNeed, currency)}</strong></p>
            <p>Jours de couverture: <strong>{data.treasuryNeed.coverageDays == null ? '—' : `${data.treasuryNeed.coverageDays.toFixed(1)} j`}</strong></p>
          </div>
        </SectionBlock>
      </div>

      <SectionBlock title="Hypothèses de calcul" subtitle="Transparence sur les approximations et conventions métier.">
        <ul className="space-y-2 text-sm text-zinc-300">
          {assumptions.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="font-medium text-zinc-100">{a.label}</p>
              <p className="mt-1 text-zinc-400">{a.description}</p>
            </li>
          ))}
        </ul>
      </SectionBlock>
    </div>
  )
}
