import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'otd_session';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

const PROTECTED_PREFIXES = [
  '/sales-orders',
  '/production-orders',
  '/material-stock',
  '/outbound-delivery',
  '/billing-documents',
  '/material-documents',
  '/products',
  '/customers',
  '/admin',
];

function isProtectedPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth/session') || pathname.startsWith('/api/auth/logout')) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Edge runtime only does a lightweight cookie shape check here.
  // Strict signature/expiry/user validation remains in Node API routes.
  const hasSession = Boolean(token && token.includes('.'));

  if (!hasSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: '请先登录', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    // Page-level admin check deferred to page; API routes enforce role
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};