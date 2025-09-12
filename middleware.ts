import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  // Refresh session if exists
  const { data: { session }, error } = await supabase.auth.getSession();

  // Protect routes
  const protectedRoutes = ['/lobby', '/game', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && (!session || error)) {
    // Redirect unauthenticated users to login with redirectTo query
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/lobby/:path*',
    '/game/:path*',
    '/profile/:path*',
    // Exclude public routes
    '/((?!auth/login|auth/register|auth/callback).*)',
  ],
};