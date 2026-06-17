import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'otd-assistant-secret-key-change-in-production'
);

// Public paths that don't require authentication
const publicPaths = ['/login', '/register', '/api/auth'];

// Static files and assets
const staticPaths = ['/_next', '/favicon', '/api/sap', '/api/settings', '/api/sync', '/api/search', '/api/dashboard'];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

function isStaticPath(pathname: string): boolean {
  return staticPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    // If already logged in and trying to access login/register, redirect to home
    const token = request.cookies.get('auth-token')?.value;
    if (token && (pathname === '/login' || pathname === '/register')) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL('/', request.url));
      } catch {
        // Token invalid, allow access to login page
      }
    }
    return NextResponse.next();
  }

  // Allow static files and API routes (except protected ones)
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token invalid, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
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
};
