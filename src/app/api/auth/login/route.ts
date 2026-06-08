import { NextRequest, NextResponse } from 'next/server';
import { authenticateByPhone } from '@/lib/portal-users';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-session';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const phone = String(body.phone ?? '').replace(/\D/g, '');
    const password = String(body.password ?? '');
    const otp = String(body.otp ?? '');

    if (!phone) {
      return NextResponse.json({ success: false, error: '请输入手机号' }, { status: 400 });
    }

    // Demo: accept OTP 123456 without password, or phone + password
    let user = null;
    if (otp === '123456') {
      const { findUserByPhone } = await import('@/lib/portal-users');
      user = findUserByPhone(phone);
      if (user && !user.active) user = null;
    } else if (password) {
      user = authenticateByPhone(phone, password);
    } else {
      return NextResponse.json({ success: false, error: '请输入密码或验证码' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: '手机号或密码错误' }, { status: 401 });
    }

    const token = createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sapUserId: user.sapUserId,
        role: user.role,
        active: user.active,
        hasSapCredentials: Boolean(user.sapCommunicationUser && user.sapCommunicationPassword),
      },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
