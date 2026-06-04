import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

// Sensitive keys - mask in GET response
const SENSITIVE_KEYS = ['sapPassword'];

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

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function buildEnvFile(values: Record<string, string>): string {
  let content = '';
  // Keep original file content for keys not in schema
  let original: Record<string, string> = {};
  if (fs.existsSync(ENV_PATH)) {
    original = parseEnvFile(fs.readFileSync(ENV_PATH, 'utf-8'));
  }

  // Write schema keys first in order
  for (const schema of CONFIG_SCHEMA) {
    const val = values[schema.key] ?? original[schema.key] ?? schema.default;
    // Quote values that contain special characters
    const needsQuotes = /[\s#$'"`{}()\[\]\\]/.test(val);
    const quoted = needsQuotes ? `'${val.replace(/'/g, "'\\''")}'` : val;
    content += `${schema.key}=${quoted}\n`;
  }

  // Preserve other keys from original file
  const schemaKeys = new Set<string>(CONFIG_SCHEMA.map(s => s.key));
  for (const [key, val] of Object.entries(original)) {
    if (!schemaKeys.has(key)) {
      const needsQuotes = /[\s#$'"`{}()\[\]\\]/.test(val);
      const quoted = needsQuotes ? `'${val.replace(/'/g, "'\\''")}'` : val;
      content += `${key}=${quoted}\n`;
    }
  }

  return content;
}

// GET /api/settings - Read current configuration
export async function GET() {
  try {
    const values: Record<string, string> = {};
    
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      const parsed = parseEnvFile(content);
      for (const schema of CONFIG_SCHEMA) {
        values[schema.key] = parsed[schema.key] ?? schema.default;
      }
    } else {
      for (const schema of CONFIG_SCHEMA) {
        values[schema.key] = schema.default;
      }
    }

    // Mask sensitive values
    const masked = { ...values };
    for (const key of SENSITIVE_KEYS) {
      if (masked[key] && masked[key].length > 0) {
        masked[key] = '••••••••';
      }
    }

    return NextResponse.json({
      success: true,
      schema: CONFIG_SCHEMA,
      values: masked,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/settings - Save configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>;
    
    // Read current values
    let current: Record<string, string> = {};
    if (fs.existsSync(ENV_PATH)) {
      current = parseEnvFile(fs.readFileSync(ENV_PATH, 'utf-8'));
    }

    // Merge: don't overwrite password with masked value
    const merged = { ...current };
    for (const schema of CONFIG_SCHEMA) {
      const newVal = body[schema.key];
      if (newVal !== undefined) {
        // Skip masked password values
        if (schema.key === 'sapPassword' && newVal === '••••••••') {
          continue;
        }
        merged[schema.key] = newVal;
      }
    }

    // Write .env.local
    const content = buildEnvFile(merged);
    fs.writeFileSync(ENV_PATH, content, 'utf-8');

    return NextResponse.json({ success: true, message: '配置已保存。请重启服务使配置生效。' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
