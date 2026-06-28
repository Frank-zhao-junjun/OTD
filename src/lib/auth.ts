import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getJwtSecretKey } from '@/lib/app-config';
import type { UserRole } from '@/lib/users';

export interface SessionUser {
  userId: string;
  username: string;
  role: UserRole;
}

const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: (payload.role as UserRole) || 'user',
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// For Server Components / Server Actions (uses cookies() store)
export async function setSession(payload: SessionUser): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

// For Route Handlers — must use NextResponse to actually send the cookie
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

export { COOKIE_NAME };
