import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sync
 * Sync SAP data into the database
 * Body: { serviceEntity: string } - e.g. "CE_SALESORDER_0001:SalesOrder"
 *       or { all: true } to sync all modules
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceEntity, all } = body as { serviceEntity?: string; all?: boolean };

    if (!serviceEntity && !all) {
      return NextResponse.json(
        { success: false, error: 'Provide serviceEntity or all=true' },
        { status: 400 }
      );
    }

    // Import sync dependencies
    const { syncModuleToDb } = await import('@/lib/db-service');
    const { SAP_TABLE_FIELDS } = await import('@/lib/sap-db-sync');

    const modules = all
      ? Object.keys(SAP_TABLE_FIELDS)
      : [serviceEntity!];

    const results: Record<string, { upserted: number; error?: string }> = {};

    for (const moduleKey of modules) {
      // Fetch from SAP API (internal call)
      const [service, entity] = moduleKey.split(':');
      const sapUrl = new URL(`/api/sap/${service}/${entity}`, request.url);
      sapUrl.searchParams.set('top', '1000'); // Fetch up to 1000 records per sync
      sapUrl.searchParams.set('skip_sap_sync', 'true'); // Prevent infinite loop

      const sapResponse = await fetch(sapUrl.toString());
      const sapData = await sapResponse.json();

      if (!sapData.success) {
        results[moduleKey] = { upserted: 0, error: sapData.error || 'SAP fetch failed' };
        continue;
      }

      const result = await syncModuleToDb(moduleKey, sapData.data);
      results[moduleKey] = result;
    }

    const totalUpserted = Object.values(results).reduce((sum, r) => sum + r.upserted, 0);
    const errors = Object.entries(results)
      .filter(([, r]) => r.error)
      .map(([k, r]) => `${k}: ${r.error}`);

    return NextResponse.json({
      success: true,
      totalUpserted,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync API error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
