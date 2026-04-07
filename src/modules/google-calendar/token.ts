import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleCalendarToken } from './types'

const BUFFER_MS = 5 * 60 * 1000

function mapTokenRow(row: Record<string, unknown>): GoogleCalendarToken {
  return {
    user_id: row.user_id as string,
    access_token: row.access_token as string,
    refresh_token: row.refresh_token as string,
    token_expiry: row.token_expiry as string,
    scope: (row.scope as string | null) ?? null,
  }
}

export async function getToken(
  supabase: SupabaseClient,
  userId: string
): Promise<GoogleCalendarToken | null> {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('user_id, access_token, refresh_token, token_expiry, scope')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapTokenRow(data as Record<string, unknown>)
}

export interface SaveTokenInput {
  access_token: string
  refresh_token: string
  token_expiry: string
  scope?: string | null
}

export async function saveToken(
  supabase: SupabaseClient,
  userId: string,
  tokenData: SaveTokenInput
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('google_calendar_tokens').upsert(
    {
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: tokenData.token_expiry,
      scope: tokenData.scope ?? null,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
}

export async function refreshAccessToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Configuration Google OAuth manquante')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Refresh token Google: ${res.status} ${errText.slice(0, 200)}`)
  }

  const json = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
    scope?: string
  }

  const expiresIn = json.expires_in ?? 3600
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
  const newRefresh = json.refresh_token ?? refreshToken

  await saveToken(supabase, userId, {
    access_token: json.access_token,
    refresh_token: newRefresh,
    token_expiry: tokenExpiry,
    scope: json.scope ?? null,
  })

  return json.access_token
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const row = await getToken(supabase, userId)
  if (!row) return null

  const expiryMs = new Date(row.token_expiry).getTime()
  if (expiryMs > Date.now() + BUFFER_MS) {
    return row.access_token
  }

  try {
    return await refreshAccessToken(supabase, userId, row.refresh_token)
  } catch {
    return null
  }
}

export async function deleteTokenForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('google_calendar_tokens').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function hasGoogleCalendarToken(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('google_calendar_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}
