import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { DailyBriefingPayload } from '../types'
import { AlertTriangle, Gauge, ListTodo, ShieldAlert, TrendingDown } from 'lucide-react'

function crisisLabel(severity: DailyBriefingPayload['crisisMode']['severity']): string {
  if (severity === 'critical') return 'Crise'
  if (severity === 'high') return 'Tension haute'
  if (severity === 'elevated') return 'Surveillance'
  return 'Normal'
}

export function CopilotExecutivePanel({ briefing }: { briefing: DailyBriefingPayload | null }) {
  if (!briefing) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="p-4 text-sm text-zinc-500">
          Pilotage exécutif indisponible (migrations ou données manquantes).
        </CardContent>
      </Card>
    )
  }

  const crisis = briefing.crisisMode
  const d = briefing.discipline
  const snap = briefing.financialSnapshot
  const fmt = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: briefing.baseCurrency }).format(n)

  return (
    <div className="space-y-3">
      <Card
        className={
          crisis.isCrisisMode
            ? 'border-red-500/50 bg-red-950/20'
            : 'border-amber-500/35 bg-amber-500/[0.06]'
        }
      >
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-amber-400" aria-hidden />
              <span className="text-sm font-medium text-zinc-100">Discipline</span>
              <span className="text-lg font-semibold tabular-nums text-zinc-100">{d.score}</span>
              <span className="text-xs text-zinc-500">/100 · {d.level}</span>
            </div>
            {crisis.isCrisisMode ? (
              <Badge variant="destructive" className="gap-1 text-[10px] uppercase tracking-wide">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                {crisisLabel(crisis.severity)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-zinc-400">
                {crisisLabel(crisis.severity)}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[10px] text-zinc-600">
            Crise score {crisis.scoreTotal}
            {snap.fxIncomplete ? ' · FX partiel' : ''}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{briefing.disciplineSummary}</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <TrendingDown className="h-4 w-4 text-emerald-500/90" aria-hidden />
            Synthèse finance ({briefing.baseCurrency})
          </div>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-400">
            <li>Cash : {fmt(snap.availableCash)}</li>
            <li>
              7j — sorties {fmt(snap.dueIn7Days)} · encaissements {fmt(snap.expectedInflows7Days)} · net{' '}
              {fmt(snap.forecastNet7Days)}
            </li>
            <li>Retards : {fmt(snap.totalOverdueAmount)} ({snap.overdueCount ?? 0})</li>
          </ul>
          {briefing.weakestEntity ? (
            <p className="mt-2 border-t border-zinc-800/80 pt-2 text-xs text-amber-200/85">
              Entité tendue : {briefing.weakestEntity.name} — {briefing.weakestEntity.reason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <ShieldAlert className="h-4 w-4 text-amber-500/90" aria-hidden />
            Briefing du jour
          </div>
          <p className="mt-2 text-sm font-medium leading-snug text-zinc-200">{briefing.headline}</p>
          <p className="mt-2 text-xs text-zinc-500">{briefing.mainRisk}</p>
          <p className="mt-3 text-xs font-medium text-amber-200/90">{briefing.decisionOfTheDay}</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <ListTodo className="h-4 w-4 text-zinc-400" aria-hidden />
            Priorités immédiates
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-zinc-400">
            {briefing.topActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-zinc-100">Points d’attention</p>
          <ul className="mt-2 space-y-1.5 text-xs text-zinc-500">
            {briefing.financialHighlights.slice(0, 3).map((h) => (
              <li key={h}>{h}</li>
            ))}
            {briefing.watchItems.length === 0 ? (
              <li>Rien de bloquant côté signaux courts.</li>
            ) : (
              briefing.watchItems.map((w) => <li key={w}>{w}</li>)
            )}
          </ul>
        </CardContent>
      </Card>

      <details className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-[10px] text-zinc-600">
        <summary className="cursor-pointer select-none text-zinc-500">Sources utilisées</summary>
        <p className="mt-2 leading-relaxed">{briefing.sourceSummary.join(' · ')}</p>
      </details>
    </div>
  )
}
