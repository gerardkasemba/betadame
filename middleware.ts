import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  // Refresh session if exists
  const { data: { session }, error } = await supabase.auth.getSession();

  // Define protected routes (require authentication)
  const protectedRoutes = ['/lobby', '/game', '/profile', '/admin'];
  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Define auth routes (should not be accessible when authenticated)
  const authRoutes = ['/auth/login', '/auth/register'];
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && session && !error) {
    // Redirect to lobby or the redirectTo parameter if exists
    const redirectTo = req.nextUrl.searchParams.get('redirectTo') || '/lobby';
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Protect routes that require authentication
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
    // Match all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};