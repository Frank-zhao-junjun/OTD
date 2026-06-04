import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth-session';
import { deletePortalUser, updatePortalUser } from '@/lib/portal-users';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const auth = await getSessionUserFromRequest(request);
  if (!auth || auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const user = updatePortalUser(id, {
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      displayName: body.displayName !== undefined ? String(body.displayName) : undefined,
      password: body.password ? String(body.password) : undefined,
      sapUserId: body.sapUserId !== undefined ? (body.sapUserId ? String(body.sapUserId) : null) : undefined,
      sapCommunicationUser:
        body.sapCommunicationUser !== undefined
          ? body.sapCommunicationUser
            ? String(body.sapCommunicationUser)
            : null
          : undefined,
      sapCommunicationPassword:
        body.sapCommunicationPassword !== undefined
          ? body.sapCommunicationPassword
            ? String(body.sapCommunicationPassword)
            : null
          : undefined,
      role: body.role === 'admin' ? 'admin' : body.role === 'user' ? 'user' : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const auth = await getSessionUserFromRequest(request);
  if (!auth || auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  }
  const { id } = await params;
  try {
    deletePortalUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除失败';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
