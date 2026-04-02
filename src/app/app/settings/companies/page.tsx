import { redirect } from 'next/navigation'
import { getAccessScope } from '@/lib/auth/get-access-scope'
import { CompaniesView } from '@/modules/companies/components/CompaniesView'

export default async function SettingsCompaniesPage() {
  const scope = await getAccessScope()
  if (!scope) redirect('/sign-in')
  if (!scope.isGroupAdmin || !scope.group) redirect('/app')

  return (
    <CompaniesView
      groupId={scope.group.id}
      companies={scope.companies}
      canManage={true}
    />
  )
}
