import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { getCreditorsForCompanies, getDebtTotalsByCreditorForCompanies } from '@/modules/creditors/queries'
import { GroupCreditorsView } from '@/modules/creditors/components/GroupCreditorsView'

export default async function GroupCreditorsPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin) {
    const first = scope.companies[0]
    if (first) redirect(`/app/${first.id}/creditors`)
    redirect('/app/tasks')
  }

  const companies = scope.companies
  const companyIds = companies.map((c) => c.id)
  const companyCurrencyById = Object.fromEntries(companies.map((c) => [c.id, c.default_currency]))
  const [creditors, { byCreditorId, totalsByCurrency }] = await Promise.all([
    getCreditorsForCompanies(companyIds),
    getDebtTotalsByCreditorForCompanies(companyIds, companyCurrencyById),
  ])

  return (
    <GroupCreditorsView
      companies={companies}
      creditors={creditors}
      totalsByCreditor={byCreditorId}
      totalsByCurrency={totalsByCurrency}
    />
  )
}
