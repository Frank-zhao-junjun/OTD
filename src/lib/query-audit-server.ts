import fs from 'fs';
import path from 'path';

export interface QueryAuditEntry {
  timestamp: string;
  user: string;
  module: string;
  action: string;
  conditions: Record<string, unknown>;
  resultCount?: number;
  success: boolean;
  error?: string | null;
}

function auditLogPath(): string {
  return path.join(process.cwd(), '.data', 'query-audit.jsonl');
}

export function appendQueryAudit(entry: Omit<QueryAuditEntry, 'timestamp'> & { timestamp?: string }): void {
  const line: QueryAuditEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    user: entry.user,
    module: entry.module,
    action: entry.action,
    conditions: entry.conditions,
    resultCount: entry.resultCount,
    success: entry.success,
    error: entry.error ?? null,
  };

  const filePath = auditLogPath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(line)}\n`, 'utf8');
  } catch (err) {
    console.error('[query-audit] write failed:', err);
  }
  console.info('[query-audit]', JSON.stringify(line));
}

/** Prefer session-derived user; header is fallback for legacy clients. */
export function resolveAuditUser(requestUser?: string | null): string {
  const trimmed = requestUser?.trim();
  if (trimmed) return trimmed;
  return process.env.OTD_AUDIT_USER || 'anonymous';
}

/** Read tail of audit log (newest first). */
export function readQueryAuditEntries(options?: {
  module?: string;
  action?: string;
  maxLines?: number;
}): QueryAuditEntry[] {
  const filePath = auditLogPath();
  if (!fs.existsSync(filePath)) return [];

  const maxLines = options?.maxLines ?? 500;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);
  const tail = lines.slice(-maxLines);

  const entries: QueryAuditEntry[] = [];
  for (const line of tail) {
    try {
      const row = JSON.parse(line) as QueryAuditEntry;
      if (options?.module && row.module !== options.module) continue;
      if (options?.action && row.action !== options.action) continue;
      entries.push(row);
    } catch {
      // skip malformed line
    }
  }
  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
