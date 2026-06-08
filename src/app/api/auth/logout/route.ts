import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth-session';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
