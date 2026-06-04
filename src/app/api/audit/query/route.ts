import { NextRequest, NextResponse } from 'next/server';
import { formatAuditUser, getSessionUserFromRequest } from '@/lib/auth-session';
import { appendQueryAudit } from '@/lib/query-audit-server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getSessionUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: '请先登录', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await request.json();
    const user = formatAuditUser(auth.user);

    appendQueryAudit({
      user,
      module: String(body.module ?? 'unknown'),
      action: String(body.action ?? 'query'),
      conditions: (body.conditions as Record<string, unknown>) ?? {},
      resultCount: typeof body.resultCount === 'number' ? body.resultCount : undefined,
      success: Boolean(body.success),
      error: body.error ? String(body.error) : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
