import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth-session';
import { readQueryAuditEntries } from '@/lib/query-audit-server';
import {
  auditEntryToRecentRecord,
  type SalesOrderRecentQueryRecord,
} from '@/lib/sap-sales-order-recent-queries';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getSessionUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '请先登录', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const limit = Math.min(
      20,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '5', 10) || 5)
    );

    const entries = readQueryAuditEntries({
      module: 'sales-orders',
      action: 'list',
      maxLines: 800,
    });

    const records: SalesOrderRecentQueryRecord[] = [];
    for (const entry of entries) {
      const rec = auditEntryToRecentRecord(entry);
      if (rec) records.push(rec);
      if (records.length >= limit) break;
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
