import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: '已退出登录',
    });

    response.cookies.delete(COOKIE_NAME);

    return response;
  } catch (error) {
    console.error('[auth/logout] error:', error);
    return NextResponse.json(
      { success: false, error: '退出登录失败' },
      { status: 500 }
    );
  }
}
