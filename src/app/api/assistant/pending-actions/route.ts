import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPendingActions } from '@/modules/assistant/confirmations'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ pending: [] })

  const pending = await getPendingActions(supabase, user.id, 'pending')
  return NextResponse.json({
    pending: pending.map((p) => ({
      id: p.id,
      action_name: p.action_name,
      action_payload_json: p.action_payload_json,
      created_at: p.created_at,
    })),
  })
}
