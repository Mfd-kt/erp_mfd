import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { canManageGroupExchangeRates } from '@/lib/auth'
import { getExchangeRates } from '@/modules/exchange-rates/queries'
import { ExchangeRatesView } from '@/modules/exchange-rates/components/ExchangeRatesView'

export default async function ExchangeRatesPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.group) redirect('/app')

  const supabase = await createClient()
  const [rates, canManage] = await Promise.all([
    getExchangeRates(),
    canManageGroupExchangeRates(supabase, scope.group.id),
  ])

  return (
    <ExchangeRatesView
      groupId={scope.group.id}
      baseCurrency={scope.group.base_currency}
      rates={rates}
      canManage={canManage}
    />
  )
}
