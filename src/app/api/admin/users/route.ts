import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth-session';
import { createPortalUser, listPortalUsers } from '@/lib/portal-users';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await getSessionUserFromRequest(request);
  if (!auth || auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }
  return NextResponse.json({ success: true, data: listPortalUsers() });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await getSessionUserFromRequest(request);
  if (!auth || auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const user = createPortalUser({
      phone: String(body.phone ?? ''),
      displayName: String(body.displayName ?? ''),
      password: body.password ? String(body.password) : undefined,
      sapUserId: body.sapUserId !== undefined ? (body.sapUserId ? String(body.sapUserId) : null) : undefined,
      sapCommunicationUser: body.sapCommunicationUser ? String(body.sapCommunicationUser) : null,
      sapCommunicationPassword: body.sapCommunicationPassword
        ? String(body.sapCommunicationPassword)
        : null,
      role: body.role === 'admin' ? 'admin' : 'user',
      active: body.active !== false,
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
