'use client';

export interface ClientSessionUser {
  id: string;
  phone: string;
  displayName: string;
  sapUserId: string | null;
  role: 'user' | 'admin';
  active: boolean;
  hasSapCredentials: boolean;
}

let cachedSession: ClientSessionUser | null | undefined;

export async function fetchSession(force = false): Promise<ClientSessionUser | null> {
  if (!force && cachedSession !== undefined) return cachedSession;
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) {
      cachedSession = null;
      return null;
    }
    const json = (await res.json()) as { user?: ClientSessionUser | null };
    cachedSession = json.user ?? null;
    return cachedSession;
  } catch {
    cachedSession = null;
    return null;
  }
}

export function clearSessionCache(): void {
  cachedSession = undefined;
}

export function getCachedSession(): ClientSessionUser | null | undefined {
  return cachedSession;
}

export function auditUserHeader(): Record<string, string> {
  const user = cachedSession;
  if (!user) return {};
  const sap = user.sapUserId ? `|sap:${user.sapUserId}` : '|sap:unbound';
  return { 'x-otd-user': `${user.phone}${sap}` };
}
