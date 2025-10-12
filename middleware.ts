// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect game and dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/game')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth') && user) {
    if (request.nextUrl.pathname !== '/auth/callback') {
      // Récupérer le user_type pour rediriger vers le bon dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      const redirectPath = profile?.user_type === 'wallet' 
        ? '/dashboard/digital-wallet' 
        : '/dashboard'

      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // Gestion des redirections de dashboard selon le user_type
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    // Récupérer le user_type
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    const userType = profile?.user_type

    // Si l'utilisateur est un wallet et essaie d'accéder à /dashboard
    if (userType === 'wallet' && request.nextUrl.pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard/digital-wallet', request.url))
    }

    // Si l'utilisateur est un player et essaie d'accéder à /dashboard/digital-wallet
    if (userType === 'player' && request.nextUrl.pathname === '/dashboard/digital-wallet') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Si l'utilisateur est un wallet, s'assurer qu'il reste dans /dashboard/digital-wallet
    if (userType === 'wallet' && 
        request.nextUrl.pathname.startsWith('/dashboard') && 
        !request.nextUrl.pathname.startsWith('/dashboard/digital-wallet') &&
        request.nextUrl.pathname !== '/dashboard/digital-wallet') {
      return NextResponse.redirect(new URL('/dashboard/digital-wallet', request.url))
    }

    // Si l'utilisateur est un player, s'assurer qu'il reste dans /dashboard (sous-routes autorisées)
    if (userType === 'player' && 
        request.nextUrl.pathname.startsWith('/dashboard/digital-wallet')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}