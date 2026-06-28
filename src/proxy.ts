import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretKey, isRegistrationAllowed } from '@/lib/auth-config';

const publicPagePaths = ['/login', '/register'];
const publicApiPrefixes = ['/api/auth/captcha', '/api/auth/login', '/api/auth/register', '/api/auth/config', '/api/auth/logout'];
const adminPagePrefixes = ['/admin'];
const adminApiPrefixes = ['/api/admin'];

function isPublicPage(pathname: string): boolean {
  if (pathname === '/register' && !isRegistrationAllowed()) return false;
  return publicPagePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApi(pathname: string): boolean {
  return publicApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAdminRoute(pathname: string): boolean {
  return adminPagePrefixes.some((p) => pathname.startsWith(p)) || adminApiPrefixes.some((p) => pathname.startsWith(p));
}

function unauthorizedResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: '未授权，请先登录' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function forbiddenResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: '权限不足，需要管理员权限' }, { status: 403 });
  }
  return NextResponse.redirect(new URL('/', request.url));
}

export async function proxy(request: NextRequest) {
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
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    // Admin route protection
    if (isAdminRoute(pathname) && payload.role !== 'admin') {
      return forbiddenResponse(request);
    }

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
