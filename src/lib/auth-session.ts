import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { findUserById, type PortalUser, type PortalUserPublic } from '@/lib/portal-users';

export const SESSION_COOKIE = 'otd_session';
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  phone: string;
  exp: number;
}

export interface SessionUser extends PortalUserPublic {
  sapUserId: string | null;
}

function sessionSecret(): string {
  return process.env.OTD_SESSION_SECRET || 'otd-dev-session-secret-change-me';
}

function signPayload(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(user: PortalUser): string {
  const payload: SessionPayload = {
    userId: user.id,
    phone: user.phone,
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  };
  return signPayload(payload);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function getSessionUserFromRequest(
  request: NextRequest
): Promise<{ session: SessionPayload; user: PortalUser } | null> {
  const session = getSessionFromRequest(request);
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user || !user.active) return null;
  return { session, user };
}

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user || !user.active) return null;
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    sapUserId: user.sapUserId,
    role: user.role,
    active: user.active,
    hasSapCredentials: Boolean(user.sapCommunicationUser && user.sapCommunicationPassword),
  };
}

/** Audit label: phone + SAP User ID when bound. */
export function formatAuditUser(user: PortalUser | SessionUser): string {
  const sap = user.sapUserId ? `|sap:${user.sapUserId}` : '|sap:unbound';
  return `${user.phone}${sap}`;
}
