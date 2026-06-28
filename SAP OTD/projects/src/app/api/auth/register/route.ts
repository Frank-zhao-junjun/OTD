import { NextRequest, NextResponse } from 'next/server';
import { isRegistrationAllowed } from '@/lib/app-config';
import { createUser } from '@/lib/users';

export async function POST(request: NextRequest) {
  if (!isRegistrationAllowed()) {
    return NextResponse.json(
      { success: false, error: '注册功能已关闭，请联系管理员' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { username, password, email, displayName } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: '用户名长度必须在3-20个字符之间' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码长度至少6个字符' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric and underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    const user = await createUser(username, password, email, displayName);

    return NextResponse.json({
      success: true,
      message: '注册成功',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.message === '用户名已存在') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
