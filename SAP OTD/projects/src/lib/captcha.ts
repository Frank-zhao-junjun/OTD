import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/app-config';

const CAPTCHA_EXPIRY_SECONDS = 300; // 5 minutes

export interface CaptchaTokenPayload {
  code: string;
  exp: number;
}

/**
 * Generate a signed JWT token containing the captcha code.
 * Stateless: works across multiple instances / serverless.
 * Returns the JWT string and the raw code (for SVG generation).
 */
export async function createCaptchaToken(): Promise<{ token: string; code: string }> {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const token = await new SignJWT({ code })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${CAPTCHA_EXPIRY_SECONDS}s`)
    .sign(getJwtSecretKey());
  return { token, code };
}

/**
 * Verify a captcha code against a signed JWT token.
 * The token is one-time-use: we don't invalidate it here
 * (5-min expiry + each login regenerates it is sufficient).
 */
export async function verifyCaptcha(
  inputCode: string,
  captchaToken: string,
): Promise<boolean> {
  if (!inputCode || !captchaToken) return false;

  try {
    const { payload } = await jwtVerify(captchaToken, getJwtSecretKey());
    const expectedCode = payload.code as string;
    return expectedCode === inputCode;
  } catch {
    // Token expired, malformed, or invalid signature
    return false;
  }
}
