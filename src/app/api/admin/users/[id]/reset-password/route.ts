import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resetUserPassword } from '@/lib/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '新密码长度至少6个字符' },
        { status: 400 }
      );
    }

    const success = await resetUserPassword(id, newPassword);
    if (!success) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: '密码已重置' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: '重置密码失败' },
      { status: 500 }
    );
  }
}
