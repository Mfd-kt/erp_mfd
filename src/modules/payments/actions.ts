'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertCanManageCompany } from '@/lib/auth'
import { logError } from '@/lib/errors/logger'
import { paymentSchema } from './schema'
import { getDebtById } from '@/modules/debts/queries'
import { getAccountById } from '@/modules/accounts/queries'
import { assertAccountMatchesPaymentMethod } from '@/modules/payments/payment-account-policy'
import { logActivity } from '@/modules/activity/service'
import { notifyCompanyMembers } from '@/modules/notifications/service'
import { runAutomationsForTrigger } from '@/modules/automation/service'
import { triggerWebhooks } from '@/modules/integrations/webhooks'
import type { Payment } from '@/lib/supabase/types'

export async function createPayment(companyId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = paymentSchema.parse(formData)

  const debt = await getDebtById(companyId, parsed.debt_id)
  if (!debt) throw new Error('Dette introuvable ou non autorisée.')
  if (debt.company_id !== companyId) throw new Error('Dette d\'une autre société.')

  const remaining = Number(debt.remaining_company_currency)
  if (remaining <= 0) throw new Error('Cette dette est déjà entièrement payée.')

  const account = await getAccountById(companyId, parsed.account_id)
  if (!account) throw new Error('Compte introuvable.')
  if (account.company_id !== companyId) throw new Error('Le compte doit appartenir à la même société que la dette.')
  assertAccountMatchesPaymentMethod(account.account_type, parsed.payment_method)

  const debtAmountOriginal = Number(debt.amount_original) || 1
  const debtAmountCompany = Number(debt.amount_company_currency)
  const fxRate =
    parsed.currency_code === debt.currency_code
      ? debtAmountCompany / debtAmountOriginal
      : 1
  const amountInCompanyCurrency = Math.round(parsed.amount * fxRate * 100) / 100

  if (parsed.amount <= 0) throw new Error('Le montant doit être strictement positif.')
  if (amountInCompanyCurrency > remaining) {
    throw new Error(`Le montant ne peut pas dépasser le restant dû (${remaining.toFixed(2)}).`)
  }

  const payload = {
    company_id: companyId,
    debt_id: parsed.debt_id,
    account_id: parsed.account_id,
    amount: parsed.amount,
    currency_code: parsed.currency_code,
    fx_rate_to_company_currency: fxRate,
    amount_company_currency: amountInCompanyCurrency,
    payment_date: parsed.payment_date,
    payment_method: parsed.payment_method,
    reference: parsed.reference ?? null,
    notes: parsed.notes ?? null,
  }
  const { data, error } = await supabase.from('payments').insert(payload).select('id').single()
  if (error) {
    await logError({
      serviceName: 'payments',
      functionName: 'createPayment',
      errorMessage: error.message,
      metadata: { companyId, debtId: parsed.debt_id },
    })
    throw new Error(error.message)
  }

  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'payment_created',
    entityType: 'payment',
    entityId: data?.id ?? null,
    metadata: { debt_id: parsed.debt_id, amount: parsed.amount, currency_code: parsed.currency_code },
  })
  await notifyCompanyMembers(supabase, companyId, {
    title: 'Paiement enregistré',
    message: `${parsed.amount.toFixed(2)} ${parsed.currency_code} ont été enregistrés sur une dette.`,
    type: 'success',
  })
  await runAutomationsForTrigger(supabase, companyId, 'payment_created', {
    amount: amountInCompanyCurrency,
    currency_code: parsed.currency_code,
    entityType: 'payment',
    entityId: data?.id ?? null,
    title: debt.title,
    userId: user?.id ?? null,
  })
  await triggerWebhooks(supabase, companyId, 'payment_created', {
    paymentId: data?.id ?? null,
    debtId: parsed.debt_id,
    amount: parsed.amount,
    currency_code: parsed.currency_code,
  })

  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/debts/${parsed.debt_id}`)
  revalidatePath(`/app/${companyId}/payments`)
  revalidatePath(`/app/${companyId}/accounts`)
  revalidatePath(`/app/${companyId}/accounts/${parsed.account_id}`)
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}

export async function updatePayment(companyId: string, paymentId: string, formData: unknown) {
  const supabase = await createClient()
  await assertCanManageCompany(supabase, companyId)
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = paymentSchema.parse(formData)

  const { data: existing, error: fetchErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('company_id', companyId)
    .single()

  if (fetchErr || !existing) throw new Error('Paiement introuvable.')
  const row = existing as Payment
  if (!row.debt_id) throw new Error('Ce paiement ne peut pas être modifié (aucune dette liée).')
  if (parsed.debt_id !== row.debt_id) {
    throw new Error('La dette associée au paiement ne peut pas être changée.')
  }

  const debt = await getDebtById(companyId, parsed.debt_id)
  if (!debt) throw new Error('Dette introuvable ou non autorisée.')
  if (debt.company_id !== companyId) throw new Error('Dette d\'une autre société.')

  const account = await getAccountById(companyId, parsed.account_id)
  if (!account) throw new Error('Compte introuvable.')
  if (account.company_id !== companyId) throw new Error('Le compte doit appartenir à la même société que la dette.')
  assertAccountMatchesPaymentMethod(account.account_type, parsed.payment_method)

  const oldAmountCompany = Number(row.amount_company_currency)
  const remaining = Number(debt.remaining_company_currency)
  const maxAmountCompany = remaining + oldAmountCompany

  const debtAmountOriginal = Number(debt.amount_original) || 1
  const debtAmountCompany = Number(debt.amount_company_currency)
  const fxRate =
    parsed.currency_code === debt.currency_code
      ? debtAmountCompany / debtAmountOriginal
      : 1
  const amountInCompanyCurrency = Math.round(parsed.amount * fxRate * 100) / 100

  if (amountInCompanyCurrency > maxAmountCompany + 0.005) {
    throw new Error(
      `Le montant ne peut pas dépasser ${maxAmountCompany.toFixed(2)} (devise de la société, plafond compte tenu de ce paiement).`,
    )
  }

  const payload = {
    account_id: parsed.account_id,
    amount: parsed.amount,
    currency_code: parsed.currency_code,
    fx_rate_to_company_currency: fxRate,
    amount_company_currency: amountInCompanyCurrency,
    payment_date: parsed.payment_date,
    payment_method: parsed.payment_method,
    reference: parsed.reference ?? null,
    notes: parsed.notes ?? null,
  }

  const { error } = await supabase
    .from('payments')
    .update(payload as never)
    .eq('id', paymentId)
    .eq('company_id', companyId)

  if (error) {
    await logError({
      serviceName: 'payments',
      functionName: 'updatePayment',
      errorMessage: error.message,
      metadata: { companyId, paymentId, debtId: parsed.debt_id },
    })
    throw new Error(error.message)
  }

  await logActivity(supabase, {
    companyId,
    userId: user?.id ?? null,
    actionType: 'payment_updated',
    entityType: 'payment',
    entityId: paymentId,
    metadata: {
      debt_id: parsed.debt_id,
      amount: parsed.amount,
      currency_code: parsed.currency_code,
    },
  })
  await notifyCompanyMembers(supabase, companyId, {
    title: 'Paiement modifié',
    message: `Un règlement a été mis à jour (${parsed.amount.toFixed(2)} ${parsed.currency_code}).`,
    type: 'info',
  })

  revalidatePath(`/app/${companyId}/debts`)
  revalidatePath(`/app/${companyId}/debts/${parsed.debt_id}`)
  revalidatePath(`/app/${companyId}/payments`)
  revalidatePath(`/app/${companyId}/accounts`)
  revalidatePath(`/app/${companyId}/accounts/${parsed.account_id}`)
  if (row.account_id !== parsed.account_id) {
    revalidatePath(`/app/${companyId}/accounts/${row.account_id}`)
  }
  revalidatePath(`/app/${companyId}/dashboard`)
  revalidatePath(`/app/${companyId}/activity`)
  revalidatePath(`/app/${companyId}/alerts`)
  revalidatePath(`/app/${companyId}/forecast`)
}
