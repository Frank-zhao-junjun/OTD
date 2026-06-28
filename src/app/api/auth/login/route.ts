import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/users';
import { setSession } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, captchaCode, captchaToken } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    if (!captchaCode || !captchaToken) {
      return NextResponse.json(
        { success: false, error: '请输入验证码' },
        { status: 400 }
      );
    }

    // Verify captcha (stateless JWT — works across all instances)
    const captchaValid = await verifyCaptcha(captchaCode, captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { success: false, error: '验证码错误或已过期' },
        { status: 400 }
      );
    }

    // Validate user
    const user = await validateUser(username, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // Set session (includes role)
    await setSession({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
