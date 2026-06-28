export const DEFAULT_JWT_SECRET = 'otd-assistant-secret-key-change-in-production';

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret === DEFAULT_JWT_SECRET)) {
    throw new Error('JWT_SECRET must be set to a strong random value in production');
  }
  return new TextEncoder().encode(secret || DEFAULT_JWT_SECRET);
}

/** Production defaults to closed; development defaults to open unless explicitly set. */
export function isRegistrationAllowed(): boolean {
  const flag = process.env.ALLOW_REGISTRATION;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function getRequestBaseUrl(request: Request): string {
  const envBase = process.env.APP_BASE_URL?.replace(/\/$/, '');
  if (envBase) return envBase;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) {
    const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000';
    return `http://127.0.0.1:${port}`;
  }

  const proto =
    request.headers.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  return `${proto}://${host}`;
}
