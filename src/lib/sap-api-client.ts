import { parseClientSapError } from '@/lib/sap-errors';
import { auditUserHeader } from '@/lib/auth-client';

export interface SapProxyResponse<T = unknown> {
  success: boolean;
  data?: T[];
  count?: number;
  error?: string;
  code?: string;
}

export function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function sapFetchHeaders(): Record<string, string> {
  return {
    ...auditUserHeader(),
  };
}

export async function fetchSapEntity<T = unknown>(
  service: string,
  entity: string,
  params: URLSearchParams
): Promise<SapProxyResponse<T>> {
  const response = await fetch(`/api/sap/${service}/${entity}?${params.toString()}`, {
    credentials: 'include',
    headers: sapFetchHeaders(),
  });
  const json = (await response.json()) as SapProxyResponse<T> & { code?: string };

  if (!response.ok || !json.success) {
    throw new Error(parseClientSapError(json));
  }

  return json;
}

/** Non-throwing variant for optional drill-through APIs that may be unavailable in SAP. */
export async function fetchSapEntityOptional<T = unknown>(
  service: string,
  entity: string,
  params: URLSearchParams
): Promise<{ data: T[]; error?: string }> {
  try {
    const res = await fetchSapEntity<T>(service, entity, params);
    return { data: res.data ?? [] };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function logQueryAudit(payload: {
  module: string;
  action: string;
  conditions: Record<string, unknown>;
  resultCount?: number;
  success: boolean;
  error?: string | null;
  user?: string;
}): Promise<void> {
  try {
    await fetch('/api/audit/query', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...auditUserHeader(),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Audit must not break primary query flow
  }
}

export function parseSapDate(raw: string | undefined): string {
  if (!raw) return '-';
  const match = raw.match(/\/Date\((\d+)\)\//);
  if (match) return new Date(parseInt(match[1], 10)).toISOString().split('T')[0];
  return raw.split('T')[0];
}
