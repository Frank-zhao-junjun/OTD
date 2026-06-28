import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listUsers } from '@/lib/users';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const users = listUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}
