'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { currencyCodeSchema } from '@/lib/currencies'

export async function setupInitialGroup(formData: { groupName: string; baseCurrency: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { groupName, baseCurrency } = formData
  if (!groupName?.trim()) throw new Error('Le nom du groupe est requis')
  if (!baseCurrency?.trim()) throw new Error('La devise de base est requise')
  const currencyParsed = currencyCodeSchema.safeParse(baseCurrency.trim().toUpperCase())
  if (!currencyParsed.success) throw new Error('Devise non autorisée (TND, EUR ou USD).')

  // Ensure countries and currencies exist (required for companies)
  const countries = [
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Allemagne' },
    { code: 'GB', name: 'Royaume-Uni' },
    { code: 'US', name: 'États-Unis' },
    { code: 'TN', name: 'Tunisie' },
  ]
  const currencies = [
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'Livre sterling' },
    { code: 'USD', name: 'Dollar américain' },
    { code: 'TND', name: 'Dinar tunisien' },
  ]
  for (const c of countries) {
    await supabase.from('countries').upsert(c, { onConflict: 'code', ignoreDuplicates: true })
  }
  for (const c of currencies) {
    await supabase.from('currencies').upsert(c, { onConflict: 'code', ignoreDuplicates: true })
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: groupName.trim(), base_currency: currencyParsed.data })
    .select()
    .single()

  if (groupError) throw new Error(groupError.message)

  const { error: membershipError } = await supabase.from('memberships').insert({
    user_id: user.id,
    group_id: group.id,
    company_id: null,
    role: 'group_admin',
  })

  if (membershipError) throw new Error(membershipError.message)

  revalidatePath('/app')
  revalidatePath('/app/setup')
  revalidatePath('/app/settings/companies')
  return { groupId: group.id }
}
