import { NextResponse } from 'next/server';
import { isRegistrationAllowed } from '@/lib/app-config';

export async function GET() {
  return NextResponse.json({
    success: true,
    allowRegistration: isRegistrationAllowed(),
  });
}
