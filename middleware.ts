import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const BARBER_PROTECTED = /^\/barber(?!\/login)/;
const ADMIN_PROTECTED = /^\/admin(?!\/login)/;
const BARBER_LOGIN = '/barber/login';
const ADMIN_LOGIN = '/admin/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh session tokens in cookies
  const { supabaseResponse, user } = await updateSession(request);

  // ── Barber routes ──────────────────────────────────────────────────────────
  if (BARBER_PROTECTED.test(pathname)) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = BARBER_LOGIN;
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = user.user_metadata?.role as string | undefined;
    if (role !== 'barber' && role !== 'admin') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = BARBER_LOGIN;
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Admin routes ───────────────────────────────────────────────────────────
  if (ADMIN_PROTECTED.test(pathname)) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN;
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = user.user_metadata?.role as string | undefined;
    if (role !== 'admin') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN;
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Redirect logged-in users away from login pages ─────────────────────────
  if (user) {
    const role = user.user_metadata?.role as string | undefined;
    if (pathname === BARBER_LOGIN && (role === 'barber' || role === 'admin')) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') ?? '/barber/dashboard';
      const dest = request.nextUrl.clone();
      dest.pathname = redirectTo;
      dest.search = '';
      return NextResponse.redirect(dest);
    }
    if (pathname === ADMIN_LOGIN && role === 'admin') {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') ?? '/admin/dashboard';
      const dest = request.nextUrl.clone();
      dest.pathname = redirectTo;
      dest.search = '';
      return NextResponse.redirect(dest);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
