import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getEnvLocalPaths, getRuntimeEnvLocalPath } from '@/lib/app-config';

function getConfigPaths(): string[] {
  return getEnvLocalPaths();
}

// Sensitive keys - mask in GET response, never use process.env fallback
const SENSITIVE_KEYS = ['sapPassword'];

// 从配置文件读取值（按优先级）
function readConfigValues(): Record<string, string> {
  const values: Record<string, string> = {};
  
  // 先读 workspace 的 .env.local（低优先级）
  const paths = getConfigPaths();
  for (let i = paths.length - 1; i >= 0; i--) {
    try {
      if (fs.existsSync(paths[i])) {
        const content = fs.readFileSync(paths[i], 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            let val = trimmed.substring(eqIndex + 1).trim();
            // Remove surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            values[key] = val;
          }
        }
      }
    } catch { /* ignore */ }
  }

  // process.env 补充（仅当readEnvLocal未读到时使用）
  // 注意: dotenv-expand会破坏含$字符的密码，所以密码字段只用readEnvLocal
  for (const key of CONFIG_KEYS) {
    if (!values[key] && process.env[key] && !SENSITIVE_KEYS.includes(key as typeof SENSITIVE_KEYS[number])) {
      values[key] = process.env[key] as string;
    }
  }
  
  return values;
}

// All configurable keys with labels and types
const CONFIG_SCHEMA = [
  { key: 'sapScheme', label: '协议', type: 'select', options: ['https', 'http'], default: 'https' },
  { key: 'sapHost', label: 'SAP主机', type: 'text', default: '' },
  { key: 'sapClient', label: 'SAP客户端', type: 'text', default: '100' },
  { key: 'sapUsername', label: '通信用户名', type: 'text', default: '' },
  { key: 'sapPassword', label: '通信密码', type: 'password', default: '' },
  { key: 'USE_MOCK', label: 'Mock模式', type: 'select', options: ['true', 'false'], default: 'false' },
] as const;

type ConfigKey = typeof CONFIG_SCHEMA[number]['key'];
const CONFIG_KEYS: readonly ConfigKey[] = CONFIG_SCHEMA.map(s => s.key);

// Password mask
const MASK = '••••••••';

// GET: Read current config
export async function GET() {
  try {
    const values = readConfigValues();
    
    // Mask sensitive values
    const maskedValues: Record<string, string> = {};
    for (const key of CONFIG_KEYS) {
      if (SENSITIVE_KEYS.includes(key) && values[key]) {
        maskedValues[key] = MASK;
      } else {
        maskedValues[key] = values[key] || '';
      }
    }
    
    return NextResponse.json({
      success: true,
      schema: CONFIG_SCHEMA,
      values: maskedValues,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '读取配置失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Save config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>;

    // Validate keys
    const validated: Record<string, string> = {};
    for (const key of CONFIG_KEYS) {
      if (body[key] !== undefined) {
        validated[key] = String(body[key]);
      }
    }

    // Read existing values from all config files
    const existing = readConfigValues();

    // Merge: skip masked passwords
    for (const [key, value] of Object.entries(validated)) {
      if (SENSITIVE_KEYS.includes(key) && value === MASK) {
        continue; // Skip masked values
      }
      existing[key] = value;
    }

    // Detect writability of runtime config path
    const tmpPath = getRuntimeEnvLocalPath();
    let fileWritten = false;
    let fileWarn: string | undefined;

    try {
      // Probe: try an atomic write to see if the location is writable
      const dir = require('path').dirname(tmpPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const probe = tmpPath + '.probe';
      fs.writeFileSync(probe, '', 'utf-8');
      fs.unlinkSync(probe);
      fileWritten = true; // location is writable
    } catch {
      fileWarn = '配置文件系统不可写，本次更改仅在当前进程中生效，重启后将丢失。请通过环境变量持久化配置。';
    }

    if (fileWritten) {
      const lines: string[] = ['# SAP S/4HANA Cloud Connection Settings', '# Auto-saved by OTD助手 Settings page', ''];
      for (const key of CONFIG_KEYS) {
        if (existing[key] !== undefined) {
          const val = existing[key];
          // Quote values containing special characters
          if (/[{}()\[\]$&|;<>!#\s\\'"`]/.test(val)) {
            lines.push(`${key}='${val}'`);
          } else {
            lines.push(`${key}=${val}`);
          }
        }
      }

      fs.writeFileSync(tmpPath, lines.join('\n') + '\n', 'utf-8');
    }

    // Always update process.env so current process picks up changes immediately
    for (const [key, value] of Object.entries(validated)) {
      if (SENSITIVE_KEYS.includes(key) && value === MASK) continue;
      process.env[key] = value;
    }

    return NextResponse.json({
      success: true,
      message: fileWarn || '配置已保存，立即生效。',
      ...(fileWarn ? { warning: fileWarn } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存配置失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
