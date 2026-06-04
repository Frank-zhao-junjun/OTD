/**
 * SAP-to-Database sync service
 * Fetches data from SAP API and upserts into Supabase database
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SAP_TABLE_FIELDS, sapToDbRow, dbRowToSap } from '@/lib/sap-db-sync';

/**
 * Sync a single SAP module: fetch from SAP API → upsert into DB
 * Called by the sync API endpoint
 */
export async function syncModuleToDb(
  serviceEntity: string,
  sapData: Record<string, unknown>[]
): Promise<{ upserted: number; error?: string }> {
  const config = SAP_TABLE_FIELDS[serviceEntity];
  if (!config) {
    return { upserted: 0, error: `Unknown service:entity: ${serviceEntity}` };
  }

  if (!sapData || sapData.length === 0) {
    return { upserted: 0 };
  }

  const client = getSupabaseClient();

  try {
    // Convert SAP records to DB rows
    const dbRows = sapData.map(record => sapToDbRow(record, config));

    // Upsert in batches of 50 (Supabase URL length limit)
    const BATCH_SIZE = 50;
    let totalUpserted = 0;

    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);

      // Build unique constraint columns from keyFields
      const onConflict = config.keyFields.join(',');

      const { data, error } = await client
        .from(config.dbTable)
        .upsert(batch as Record<string, unknown>[], { onConflict })
        .select('id');

      if (error) {
        console.error(`DB upsert error for ${config.dbTable}:`, error.message);
        return { upserted: totalUpserted, error: error.message };
      }

      totalUpserted += data?.length || 0;
    }

    return { upserted: totalUpserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Sync error for ${serviceEntity}:`, msg);
    return { upserted: 0, error: msg };
  }
}

/**
 * Read data from DB and convert back to SAP format
 */
export async function readFromDb(
  serviceEntity: string,
  options: {
    filter?: Record<string, string>;
    likeFilter?: Record<string, string>;
    likeFilterMode?: 'and' | 'or';
    top?: number;
    skip?: number;
    orderBy?: string;
    id?: string;
  } = {}
): Promise<{ data: Record<string, unknown>[]; count: number; error?: string }> {
  const config = SAP_TABLE_FIELDS[serviceEntity];
  if (!config) {
    return { data: [], count: 0, error: `Unknown service:entity: ${serviceEntity}` };
  }

  const client = getSupabaseClient();

  try {
    // Get count first
    const countQuery = client
      .from(config.dbTable)
      .select('*', { count: 'exact', head: true });

    // Apply filters for count
    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        const dbKey = key; // already snake_case from filter mapping
        countQuery.eq(dbKey, value);
      }
    }
    if (options.likeFilter) {
      const mode = options.likeFilterMode || 'and';
      if (mode === 'or') {
        // Build OR condition: ilike.col1.likeval,ilike.col2.likeval
        const orParts = Object.entries(options.likeFilter).map(
          ([key, value]) => `ilike.${key}.${value}`
        );
        countQuery.or(orParts.join(','));
      } else {
        for (const [key, value] of Object.entries(options.likeFilter)) {
          countQuery.ilike(key, value);
        }
      }
    }
    if (options.id && config.keyFields.length > 0) {
      countQuery.eq(config.keyFields[0], options.id);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return { data: [], count: 0, error: countError.message };
    }

    // Build data query
    const selectFields = config.sapFields
      .map(f => {
        // Map SAP field name to DB column name
        const snakeField = f.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          .toLowerCase();
        return snakeField;
      })
      .join(',');

    let dataQuery = client
      .from(config.dbTable)
      .select(selectFields);

    // Apply filters
    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        dataQuery = dataQuery.eq(key, value);
      }
    }
    if (options.likeFilter) {
      const mode = options.likeFilterMode || 'and';
      if (mode === 'or') {
        const orParts = Object.entries(options.likeFilter).map(
          ([key, value]) => `ilike.${key}.${value}`
        );
        dataQuery = dataQuery.or(orParts.join(','));
      } else {
        for (const [key, value] of Object.entries(options.likeFilter)) {
          dataQuery = dataQuery.ilike(key, value);
        }
      }
    }
    if (options.id && config.keyFields.length > 0) {
      dataQuery = dataQuery.eq(config.keyFields[0], options.id);
    }

    // Apply ordering
    if (options.orderBy) {
      dataQuery = dataQuery.order(options.orderBy, { ascending: false });
    } else if (config.keyFields.length > 0) {
      // Default: order by first key field descending (most recent first)
      dataQuery = dataQuery.order(config.keyFields[0], { ascending: false });
    }

    // Apply pagination
    if (options.skip && options.skip > 0) {
      const end = options.skip + (options.top || 100) - 1;
      dataQuery = dataQuery.range(options.skip, end);
    } else if (options.top && options.top > 0) {
      dataQuery = dataQuery.limit(options.top);
    }

    const { data, error } = await dataQuery;

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    // Convert DB rows back to SAP format (PascalCase)
    const sapResults = (data as unknown as Record<string, unknown>[]).map(row =>
      dbRowToSap(row, config)
    );

    return { data: sapResults, count: count || 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`DB read error for ${serviceEntity}:`, msg);
    return { data: [], count: 0, error: msg };
  }
}

/**
 * Check if DB has data for a given module
 */
export async function dbHasData(serviceEntity: string): Promise<boolean> {
  const config = SAP_TABLE_FIELDS[serviceEntity];
  if (!config) return false;

  const client = getSupabaseClient();

  try {
    const { count, error } = await client
      .from(config.dbTable)
      .select('*', { count: 'exact', head: true });

    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}
