import fs from 'fs';
import path from 'path';

export interface ApiErrorEntry {
  timestamp: string;
  user: string;
  module: string;
  status?: number;
  code?: string;
  message: string;
  details?: string;
}

function logPath(): string {
  return path.join(process.cwd(), '.data', 'api-error.jsonl');
}

export function appendApiError(entry: Omit<ApiErrorEntry, 'timestamp'>): void {
  const line: ApiErrorEntry = { ...entry, timestamp: new Date().toISOString() };
  try {
    fs.mkdirSync(path.dirname(logPath()), { recursive: true });
    fs.appendFileSync(logPath(), `${JSON.stringify(line)}\n`, 'utf8');
  } catch (err) {
    console.error('[api-error-log] write failed:', err);
  }
}
