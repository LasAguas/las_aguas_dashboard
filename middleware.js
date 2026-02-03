import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Skip middleware for non-dashboard routes (public pages like index, video-portfolio, etc.)
  // Also skip for API routes, static files, and login page
  if (
    !pathname.startsWith('/dashboard') ||
    pathname.startsWith('/dashboard/login') ||
    pathname.startsWith('/dashboard/login-error') ||
    pathname.startsWith('/dashboard/privacy-policy') ||
    pathname.startsWith('/dashboard/terms-of-service') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get the current user session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // If no user is logged in, redirect to login page
  if (userError || !user) {
    const loginUrl = new URL('/dashboard/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Get the user's profile to check their role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // If we can't get the profile, redirect to login error
    const errorUrl = new URL('/dashboard/login-error', request.url)
    return NextResponse.redirect(errorUrl)
  }

  const role = profile.role
  const isArtistRoute = pathname.startsWith('/dashboard/artist')

  // Artist users: can only access /dashboard/artist/* routes
  if (role === 'artist') {
    if (!isArtistRoute) {
      // Redirect artists away from admin dashboard to their home
      const artistHomeUrl = new URL('/dashboard/artist/home', request.url)
      return NextResponse.redirect(artistHomeUrl)
    }
  }

  // Las Aguas (admin) users: can access everything EXCEPT /dashboard/artist/* routes
  if (role === 'las_aguas') {
    if (isArtistRoute) {
      // Redirect admins away from artist routes to admin dashboard
      const adminHomeUrl = new URL('/dashboard/menu', request.url)
      return NextResponse.redirect(adminHomeUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
