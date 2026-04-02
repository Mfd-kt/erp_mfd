import type { SupabaseClient } from '@supabase/supabase-js'
import type { DebtPriority, AlertSeverity } from '@/lib/supabase/types'
import type { Company } from '@/lib/supabase/types'
import { generateCompanyForecast, generateGroupForecast } from '@/modules/forecast/service'
import type { Alert, CompanyAlertsResult, GroupAlertsResult } from './types'

function priorityToSeverity(p: DebtPriority | null): AlertSeverity {
  if (!p) return 'warning'
  if (p === 'critical' || p === 'high') return 'critical'
  return 'warning'
}

function countBySeverity(alerts: Alert[]) {
  return {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warnings: alerts.filter((a) => a.severity === 'warning').length,
    infos: alerts.filter((a) => a.severity === 'info').length,
  }
}

export async function computeCompanyAlerts(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyAlertsResult> {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const in7 = new Date(today)
  in7.setDate(today.getDate() + 7)
  const in7Str = in7.toISOString().slice(0, 10)

  const alerts: Alert[] = []

  // Debts
  const { data: debts } = await supabase
    .from('debts_with_remaining')
    .select('id, title, due_date, remaining_company_currency, computed_status, priority')
    .eq('company_id', companyId)
    .not('computed_status', 'in', '("paid","cancelled")')

  for (const d of debts ?? []) {
    const remaining = Number(d.remaining_company_currency ?? 0)
    if (remaining <= 0) continue

    const priority = d.priority as DebtPriority | null
    const due = d.due_date as string | null

    if (d.computed_status === 'overdue') {
      alerts.push({
        id: crypto.randomUUID(),
        groupId: null,
        companyId,
        alertType: 'debt_overdue',
        severity: priorityToSeverity(priority),
        title: `Dette en retard — ${d.title}`,
        message: `Cette dette est en retard. Montant restant: ${remaining.toFixed(0)}.`,
        entityType: 'debt',
        entityId: d.id,
        isRead: false,
        createdAt: today.toISOString(),
        resolvedAt: null,
      })
    }

    if (due && due >= todayStr && due <= in7Str) {
      alerts.push({
        id: crypto.randomUUID(),
        groupId: null,
        companyId,
        alertType: 'debt_due_soon',
        severity: 'warning',
        title: `Échéance proche — ${d.title}`,
        message: `Cette dette arrive à échéance le ${due}.`,
        entityType: 'debt',
        entityId: d.id,
        isRead: false,
        createdAt: today.toISOString(),
        resolvedAt: null,
      })
    }

    if (priority === 'critical') {
      alerts.push({
        id: crypto.randomUUID(),
        groupId: null,
        companyId,
        alertType: 'debt_critical_unpaid',
        severity: 'critical',
        title: `Dette critique impayée — ${d.title}`,
        message: `Dette prioritaire non réglée. Vérifiez ce poste en priorité.`,
        entityType: 'debt',
        entityId: d.id,
        isRead: false,
        createdAt: today.toISOString(),
        resolvedAt: null,
      })
    }
  }

  // Revenues
  const { data: revenues } = await supabase
    .from('revenues')
    .select('id, title, amount_expected, amount_received, expected_date, status')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')

  for (const r of revenues ?? []) {
    const expected = Number(r.amount_expected ?? 0)
    const received = Number(r.amount_received ?? 0)
    const remaining = expected - received
    if (remaining <= 0) continue
    const expectedDate = r.expected_date as string

    if (expectedDate < todayStr) {
      if (received > 0) {
        alerts.push({
          id: crypto.randomUUID(),
          groupId: null,
          companyId,
          alertType: 'revenue_partial_overdue',
          severity: 'warning',
          title: `Revenu partiel en retard — ${r.title}`,
          message: `Une partie du revenu n'a pas été reçue après la date prévue.`,
          entityType: 'revenue',
          entityId: r.id,
          isRead: false,
          createdAt: today.toISOString(),
          resolvedAt: null,
        })
      } else {
        alerts.push({
          id: crypto.randomUUID(),
          groupId: null,
          companyId,
          alertType: 'revenue_overdue',
          severity: 'warning',
          title: `Revenu non reçu — ${r.title}`,
          message: `Revenu attendu au ${expectedDate} non reçu.`,
          entityType: 'revenue',
          entityId: r.id,
          isRead: false,
          createdAt: today.toISOString(),
          resolvedAt: null,
        })
      }
    }
  }

  // Treasury via forecast (2 months)
  const { data: companyRow } = await supabase
    .from('companies')
    .select('default_currency')
    .eq('id', companyId)
    .single()

  const cur = companyRow?.default_currency ?? 'EUR'
  const forecast = await generateCompanyForecast(supabase, companyId, cur, 2)
  const current = forecast.periods[0]
  const next = forecast.periods[1]

  if (current && current.closingCashProjected < 0) {
    alerts.push({
      id: crypto.randomUUID(),
      groupId: null,
      companyId,
      alertType: 'treasury_negative_projection',
      severity: 'critical',
      title: 'Trésorerie négative projetée (mois en cours)',
      message: 'La trésorerie projetée en fin de mois est négative.',
      entityType: 'forecast',
      entityId: null,
      isRead: false,
      createdAt: today.toISOString(),
      resolvedAt: null,
    })
  }

  if (next && next.closingCashProjected < 0) {
    alerts.push({
      id: crypto.randomUUID(),
      groupId: null,
      companyId,
      alertType: 'treasury_negative_projection',
      severity: 'warning',
      title: 'Trésorerie négative projetée (mois prochain)',
      message: 'La trésorerie projetée pour le mois prochain est négative.',
      entityType: 'forecast',
      entityId: null,
      isRead: false,
      createdAt: today.toISOString(),
      resolvedAt: null,
    })
  }

  if (current && current.closingCashProjected < current.expectedOutflows) {
    alerts.push({
      id: crypto.randomUUID(),
      groupId: null,
      companyId,
      alertType: 'treasury_low_buffer',
      severity: 'warning',
      title: 'Marge de sécurité faible',
      message: 'La trésorerie de fin de mois est inférieure aux sorties prévues.',
      entityType: 'forecast',
      entityId: null,
      isRead: false,
      createdAt: today.toISOString(),
      resolvedAt: null,
    })
  }

  const counts = countBySeverity(alerts)
  return { companyId, ...counts, alerts }
}

export async function computeGroupAlerts(
  supabase: SupabaseClient,
  groupId: string,
  companies: Company[],
  baseCurrency: string
): Promise<GroupAlertsResult> {
  const now = new Date().toISOString()
  const alerts: Alert[] = []

  const forecast = await generateGroupForecast(supabase, companies, groupId, baseCurrency, 2)

  if (forecast.incomplete && forecast.missingExchangeRates?.length) {
    alerts.push({
      id: crypto.randomUUID(),
      groupId,
      companyId: null,
      alertType: 'forecast_missing_fx',
      severity: 'warning',
      title: 'Taux de change manquants',
      message: `Paires manquantes: ${forecast.missingExchangeRates.join(', ')}`,
      entityType: 'forecast',
      entityId: null,
      isRead: false,
      createdAt: now,
      resolvedAt: null,
    })

    alerts.push({
      id: crypto.randomUUID(),
      groupId,
      companyId: null,
      alertType: 'forecast_incomplete',
      severity: 'warning',
      title: 'Prévision groupe incomplète',
      message: 'Certaines sociétés ne sont pas incluses dans la consolidation faute de taux FX.',
      entityType: 'forecast',
      entityId: null,
      isRead: false,
      createdAt: now,
      resolvedAt: null,
    })
  }

  const counts = countBySeverity(alerts)
  return { groupId, ...counts, alerts }
}
