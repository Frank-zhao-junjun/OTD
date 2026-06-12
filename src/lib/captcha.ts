import { cookies } from 'next/headers';

interface CaptchaData {
  code: string;
  expires: number;
}

// Simple in-memory store for captcha (in production, use Redis or similar)
const captchaStore = new Map<string, CaptchaData>();

export function storeCaptcha(id: string, code: string, expires: number): void {
  captchaStore.set(id, { code, expires });
}

export async function verifyCaptcha(inputCode: string, captchaId?: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedId = captchaId || cookieStore.get('captcha-id')?.value;

  if (!storedId) return false;

  const captchaData = captchaStore.get(storedId);
  if (!captchaData) return false;

  if (Date.now() > captchaData.expires) {
    captchaStore.delete(storedId);
    return false;
  }

  const isValid = captchaData.code === inputCode;
  
  if (isValid) {
    captchaStore.delete(storedId);
    cookieStore.delete('captcha-id');
  }

  return isValid;
}
