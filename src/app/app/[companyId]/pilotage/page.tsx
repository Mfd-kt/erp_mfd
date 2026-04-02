import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Company } from '@/lib/supabase/types'
import { getCompanyPilotageData } from '@/modules/pilotage/service'
import { PilotageView } from '@/modules/pilotage/components/PilotageView'

function isDateString(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function defaultRange() {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const fromDate = new Date(now)
  fromDate.setMonth(fromDate.getMonth() - 3)
  const from = fromDate.toISOString().slice(0, 10)
  return { from, to }
}

export default async function PilotagePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ from?: string; to?: string; horizon_days?: string }>
}) {
  const { companyId } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: companyRow } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (!companyRow) notFound()
  const company = companyRow as Company

  const defaults = defaultRange()
  const range = {
    from: isDateString(sp.from) ? sp.from : defaults.from,
    to: isDateString(sp.to) ? sp.to : defaults.to,
  }
  const parsedHorizon = Number(sp.horizon_days ?? 30)
  const horizonDays = Number.isFinite(parsedHorizon)
    ? Math.min(90, Math.max(15, Math.floor(parsedHorizon)))
    : 30

  const pilotageData = await getCompanyPilotageData({
    supabase,
    companyId,
    currency: company.default_currency,
    range,
    horizonDays,
  })

  return <PilotageView company={company} data={pilotageData} horizonDays={horizonDays} />
}
