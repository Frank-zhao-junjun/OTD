import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretKey, isRegistrationAllowed } from '@/lib/auth-config';

const publicPagePaths = ['/login', '/register'];
const publicApiPrefixes = ['/api/auth/captcha', '/api/auth/login', '/api/auth/register', '/api/auth/config', '/api/auth/logout'];

function isPublicPage(pathname: string): boolean {
  if (pathname === '/register' && !isRegistrationAllowed()) return false;
  return publicPagePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApi(pathname: string): boolean {
  return publicApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function unauthorizedResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: '未授权，请先登录' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/register' && !isRegistrationAllowed()) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isPublic = isPublicPage(pathname) || isPublicApi(pathname);

  if (isPublic) {
    const token = request.cookies.get('auth-token')?.value;
    if (token && (pathname === '/login' || pathname === '/register')) {
      try {
        await jwtVerify(token, getJwtSecretKey());
        return NextResponse.redirect(new URL('/', request.url));
      } catch {
        /* invalid token — allow login/register */
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return unauthorizedResponse(request);
  }

  try {
    await jwtVerify(token, getJwtSecretKey());
    return NextResponse.next();
  } catch {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const response = NextResponse.json({ success: false, error: '登录已过期，请重新登录' }, { status: 401 });
      response.cookies.delete('auth-token');
      return response;
    }

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
