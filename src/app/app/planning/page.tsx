import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDailyPlan } from '@/modules/planning/queries'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { PlanningView } from '@/modules/planning/components/PlanningView'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const planDate = todayStr()
  const plan = await getDailyPlan(user.id, planDate)

  return (
    <div className="space-y-8">
      <HeroPageHeader
        title="Plan du jour"
        subtitle={`${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <PlanningView plan={plan} planDate={planDate} />
    </div>
  )
}
