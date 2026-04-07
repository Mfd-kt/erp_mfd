import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveToken, getToken } from '@/modules/google-calendar/token'
import { syncCalendarsFromGoogle } from '@/modules/google-calendar/service'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const oauthError = url.searchParams.get('error')
  const base = new URL(request.url).origin

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/app/calendar/settings?error=${encodeURIComponent(oauthError)}`, base)
    )
  }
  if (!code) {
    return NextResponse.redirect(new URL('/app/calendar/settings?error=missing_code', base))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', base))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/app/calendar/settings?error=config', base))
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/app/calendar/settings?error=token_exchange', base))
  }

  const json = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }

  const existing = await getToken(supabase, user.id)
  const refresh_token = json.refresh_token ?? existing?.refresh_token
  if (!refresh_token) {
    return NextResponse.redirect(new URL('/app/calendar/settings?error=no_refresh', base))
  }

  const expiresIn = json.expires_in ?? 3600
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()

  await saveToken(supabase, user.id, {
    access_token: json.access_token,
    refresh_token,
    token_expiry: tokenExpiry,
    scope: json.scope ?? null,
  })

  try {
    await syncCalendarsFromGoogle(supabase, user.id)
  } catch {
    // agendas : l’utilisateur pourra resynchroniser depuis les paramètres
  }

  return NextResponse.redirect(new URL('/app/calendar/settings', base))
}
