import { NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth-session';

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUserFromCookies();
  return NextResponse.json({ success: true, user });
}
