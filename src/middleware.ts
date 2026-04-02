import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Route classification is kept explicit to avoid auth redirect loops.
  const isAuthRoute = request.nextUrl.pathname.startsWith('/sign-in')
  const isAppRoute = request.nextUrl.pathname.startsWith('/app')
  const isSetupRoute = request.nextUrl.pathname === '/app/setup'
  const isInvitationAcceptRoute = request.nextUrl.pathname.startsWith('/app/invitations/accept')

  // Protect private app routes and preserve destination for post-login redirect.
  if (!user && isAppRoute) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('next', next)
    return NextResponse.redirect(signInUrl)
  }

  // Prevent signed-in users from staying on auth pages.
  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get('next')
    if (next && next.startsWith('/')) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    return NextResponse.redirect(new URL('/app', request.url))
  }

  // New users without memberships must complete initial workspace setup first.
  if (user && isAppRoute && !isSetupRoute && !isInvitationAcceptRoute) {
    const { data: memberships } = await supabase
      .from('memberships')
      .select('group_id')
      .eq('user_id', user.id)
      .limit(1)
    const hasGroup = memberships && memberships.length > 0
    if (!hasGroup) {
      return NextResponse.redirect(new URL('/app/setup', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
