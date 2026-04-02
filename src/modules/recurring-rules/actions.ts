'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { runRecurringGeneration } from './service'
import { recurringRuleSchema, updateRecurringRuleSchema } from './schema'
import type { RunGenerationResult } from './types'

export async function createRecurringRule(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = recurringRuleSchema.parse(formData)
  const payload = {
    company_id: companyId,
    creditor_id: parsed.creditor_id ?? null,
    debt_category_id: parsed.debt_category_id,
    title: parsed.title,
    template_description: parsed.template_description ?? null,
    amount: parsed.amount,
    currency_code: parsed.currency_code,
    frequency: parsed.frequency,
    interval_count: parsed.interval_count ?? 1,
    day_of_month: parsed.day_of_month ?? null,
    month_of_year: parsed.month_of_year ?? null,
    start_date: parsed.start_date,
    end_date: parsed.end_date ?? null,
    next_run_date: parsed.start_date,
    auto_generate: parsed.auto_generate ?? true,
    is_active: parsed.is_active ?? true,
  }
  const { error } = await supabase.from('recurring_rules').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/recurring-rules`)
}

export async function updateRecurringRule(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const parsed = updateRecurringRuleSchema.parse(formData)
  const { id, ...rest } = parsed
  const { data: existingRule, error: existingError } = await supabase
    .from('recurring_rules')
    .select(
      'frequency, interval_count, day_of_month, month_of_year, start_date, end_date, next_run_date'
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .single()
  if (existingError) throw new Error(existingError.message)

  const scheduleChanged =
    existingRule.frequency !== rest.frequency ||
    (existingRule.interval_count ?? 1) !== (rest.interval_count ?? 1) ||
    (existingRule.day_of_month ?? null) !== (rest.day_of_month ?? null) ||
    (existingRule.month_of_year ?? null) !== (rest.month_of_year ?? null) ||
    existingRule.start_date !== rest.start_date ||
    (existingRule.end_date ?? null) !== (rest.end_date ?? null)

  const payload = {
    title: rest.title,
    creditor_id: rest.creditor_id ?? null,
    debt_category_id: rest.debt_category_id,
    template_description: rest.template_description ?? null,
    amount: rest.amount,
    currency_code: rest.currency_code,
    frequency: rest.frequency,
    interval_count: rest.interval_count ?? 1,
    day_of_month: rest.day_of_month ?? null,
    month_of_year: rest.month_of_year ?? null,
    start_date: rest.start_date,
    end_date: rest.end_date ?? null,
    auto_generate: rest.auto_generate ?? true,
    is_active: rest.is_active ?? true,
    ...((scheduleChanged || existingRule.next_run_date < rest.start_date)
      ? { next_run_date: rest.start_date }
      : {}),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('recurring_rules')
    .update(payload)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/recurring-rules`)
}

export async function deleteRecurringRule(companyId: string, ruleId: string) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', ruleId)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath(`/app/${companyId}/recurring-rules`)
}

/**
 * Run idempotent generation for the given company and optional target date.
 * Safe to call multiple times; duplicates are skipped.
 */
export async function runRecurringNow(
  companyId: string,
  targetDate?: string
): Promise<RunGenerationResult> {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const date = targetDate ? new Date(targetDate) : new Date()
  const result = await runRecurringGeneration(supabase, companyId, date)
  revalidatePath(`/app/${companyId}/recurring-rules`)
  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/dashboard`)
  return result
}
