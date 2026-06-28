import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isRegistrationAllowed } from '@/lib/auth-config';
import fs from 'fs';
import path from 'path';

function getRuntimeEnvPath(): string {
  const workspace = process.env.COZE_WORKSPACE_PATH || process.cwd();
  return path.join(workspace, '.env.runtime.local');
}

function readEnvFile(): Record<string, string> {
  const envPath = getRuntimeEnvPath();
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

function writeEnvFile(env: Record<string, string>): void {
  const envPath = getRuntimeEnvPath();
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      allowed: isRegistrationAllowed(),
    });
  } catch (error) {
    console.error('Get registration status error:', error);
    return NextResponse.json(
      { success: false, error: '获取注册状态失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { allowed } = body;

    if (typeof allowed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    // Persist to runtime env file
    const env = readEnvFile();
    env.ALLOW_REGISTRATION = allowed ? 'true' : 'false';
    writeEnvFile(env);

    // Update process.env for immediate effect
    process.env.ALLOW_REGISTRATION = allowed ? 'true' : 'false';

    return NextResponse.json({
      success: true,
      allowed,
      message: allowed ? '注册已开放' : '注册已关闭',
    });
  } catch (error) {
    console.error('Toggle registration error:', error);
    return NextResponse.json(
      { success: false, error: '更新注册状态失败' },
      { status: 500 }
    );
  }
}
