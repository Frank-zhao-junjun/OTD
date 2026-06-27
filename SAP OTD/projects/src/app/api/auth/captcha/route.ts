import { NextResponse } from 'next/server';
import { storeCaptcha } from '@/lib/captcha';
import crypto from 'crypto';

export async function GET() {
  try {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    // Generate unique ID
    const id = crypto.randomUUID();
    
    // Store captcha
    storeCaptcha(id, code, expires);

    // Generate SVG
    const svg = generateCaptchaSVG(code);

    const response = NextResponse.json({
      success: true,
      captchaId: id,
      svg,
      ...(process.env.NODE_ENV !== 'production' ? { codeHint: code } : {}),
    });

    // Set cookie with captcha ID
    response.cookies.set('captcha-id', id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Captcha generation error:', error);
    return NextResponse.json(
      { success: false, error: '验证码生成失败' },
      { status: 500 }
    );
  }
}

function generateCaptchaSVG(code: string): string {
  const width = 120;
  const height = 40;
  
  const colors = ['#0070F2', '#E9730C', '#107E3E', '#BB0000'];
  
  let noise = '';
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ccc" stroke-width="1" />`;
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    noise += `<circle cx="${x}" cy="${y}" r="1" fill="#ddd" />`;
  }

  let digits = '';
  const startX = 15;
  const spacing = 25;
  
  for (let i = 0; i < code.length; i++) {
    const x = startX + i * spacing;
    const y = 28 + Math.random() * 6 - 3;
    const rotation = Math.random() * 30 - 15;
    const color = colors[i % colors.length];
    
    digits += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${color}" transform="rotate(${rotation} ${x} ${y})">${code[i]}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f5f5f5" />
    ${noise}
    ${digits}
  </svg>`;
}
