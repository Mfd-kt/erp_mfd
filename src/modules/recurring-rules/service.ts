import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecurringRule } from '@/lib/supabase/types'
import type { FrequencyType } from '@/lib/supabase/types'
import {
  getPeriodKey,
  getNextPeriod,
  getDueDateForPeriod,
  getIncurredDateForPeriod,
} from '@/lib/recurrence/period-key'
import type { RunGenerationResult } from './types'

/**
 * Idempotent recurring debt generation.
 * - One debt per rule per logical period (period key: 2026-03, 2026-Q2, 2026).
 * - Uniqueness enforced by DB: (source_recurring_rule_id, generated_period_key).
 * - Never updates existing debts; only inserts new rows and updates rule next_run_date / last_generated_at.
 * - next_run_date advances even when the debt already exists (période déjà couverte), so the rule never gets stuck.
 * - next_run_date is set to the next period's due date (e.g. 28 April for monthly day 28), not just first of month.
 * - Windowed processing: only periods in [targetDate, targetDate + anticipation window] are generated.
 * - Anticipation window: generate debts 4 days before due date for better short-term projection.
 */

function parseNextRunDate(nextRunDate: string): { year: number; month: number } {
  const d = new Date(nextRunDate)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/**
 * Prochaine date logique de génération = date d'échéance de la prochaine occurrence (ex. 28 avril pour mensuel jour 28).
 */
function getNextRunDate(
  frequency: FrequencyType,
  year: number,
  month: number,
  dayOfMonth: number
): string {
  const { year: nextYear, month: nextMonth } = getNextPeriod(frequency, year, month)
  return getDueDateForPeriod(nextYear, nextMonth, dayOfMonth)
}

/**
 * Generate debts for active rules in a bounded window [targetDate, targetDate + 4 days].
 * Older periods are skipped (next_run_date advanced) to keep execution focused on short-term projection.
 * When a debt already exists for a period: count as alreadyGenerated and still advance next_run_date so the rule progresses.
 */
export async function runRecurringGeneration(
  supabase: SupabaseClient,
  companyId: string,
  targetDate: Date
): Promise<RunGenerationResult> {
  const result: RunGenerationResult = {
    companyId,
    rulesChecked: 0,
    created: 0,
    alreadyGenerated: 0,
    errors: [],
  }

  const targetDateStr = targetDate.toISOString().slice(0, 10)
  const anticipationDays = 4
  const anticipatedTargetDate = new Date(targetDate)
  anticipatedTargetDate.setDate(anticipatedTargetDate.getDate() + anticipationDays)
  const anticipatedTargetDateStr = anticipatedTargetDate.toISOString().slice(0, 10)
  result.windowStart = targetDateStr
  result.windowEnd = anticipatedTargetDateStr

  const { data: rules, error: fetchError } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('auto_generate', true)
    .lte('next_run_date', anticipatedTargetDateStr)
    .or(`end_date.is.null,end_date.gte.${targetDateStr}`)

  if (fetchError) {
    result.errors.push(fetchError.message)
    return result
  }

  const list = (rules ?? []) as RecurringRule[]
  result.rulesChecked = list.length

  for (const rule of list) {
    if (rule.creditor_id == null) {
      result.errors.push(`Règle "${rule.title}" : pas de créancier, ignorée`)
      continue
    }

    const dayOfMonth = rule.day_of_month ?? 1
    const frequency = rule.frequency as FrequencyType
    let currentNextRun = rule.next_run_date
    if (currentNextRun < rule.start_date) {
      currentNextRun = rule.start_date
      await supabase
        .from('recurring_rules')
        .update({
          next_run_date: currentNextRun,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id)
    }

    while (currentNextRun <= anticipatedTargetDateStr) {
      if (rule.end_date != null && rule.end_date < currentNextRun) break

      const next = parseNextRunDate(currentNextRun)
      const periodKey = getPeriodKey(frequency, next.year, next.month)
      const newNextRun = getNextRunDate(frequency, next.year, next.month, dayOfMonth)

      if (currentNextRun < targetDateStr) {
        await supabase
          .from('recurring_rules')
          .update({
            next_run_date: newNextRun,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rule.id)
        currentNextRun = newNextRun
        continue
      }

      const { data: existing } = await supabase
        .from('debts')
        .select('id')
        .eq('source_recurring_rule_id', rule.id)
        .eq('generated_period_key', periodKey)
        .maybeSingle()

      if (existing) {
        result.alreadyGenerated += 1
      } else {
        const dueDate = getDueDateForPeriod(next.year, next.month, dayOfMonth)
        const incurredDate = getIncurredDateForPeriod(next.year, next.month)
        const title = `${rule.title} — ${periodKey}`

        const { error: insertError } = await supabase.from('debts').insert({
          company_id: rule.company_id,
          creditor_id: rule.creditor_id,
          debt_category_id: rule.debt_category_id,
          title,
          description: rule.template_description ?? null,
          amount_original: Number(rule.amount),
          currency_code: rule.currency_code,
          fx_rate_to_company_currency: 1,
          amount_company_currency: Number(rule.amount),
          due_date: dueDate,
          incurred_date: incurredDate,
          status: 'open',
          priority: 'normal',
          is_recurring_instance: true,
          source_recurring_rule_id: rule.id,
          generated_period_key: periodKey,
          notes: rule.template_description ?? null,
        })

        if (insertError) {
          result.errors.push(`Règle "${rule.title}" (${periodKey}) : ${insertError.message}`)
          break
        }
        result.created += 1
      }

      await supabase
        .from('recurring_rules')
        .update({
          next_run_date: newNextRun,
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id)

      currentNextRun = newNextRun
    }
  }

  return result
}
