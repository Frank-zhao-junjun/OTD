import { odataEscape } from '@/lib/sap-api-client';
import { SAP_DEFAULTS } from '@/lib/sap-service';

/** SAP InventoryStockType on A_MatlStkInAcctMod */
export const STOCK_TYPE_UNRESTRICTED = '01';
export const STOCK_TYPE_QUALITY = '02';
export const STOCK_TYPE_BLOCKED = '03';
export const STOCK_TYPE_IN_TRANSIT = '04';

export const FERT_PRODUCT_TYPE = 'FERT';

/** TODO: move to admin config UI; env override for now */
export const DEFAULT_LOW_STOCK_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD ?? '100'
);

export interface MaterialStockRawRow {
  Material: string;
  Plant: string;
  StorageLocation?: string;
  Batch?: string;
  Supplier?: string;
  Customer?: string;
  InventoryStockType?: string;
  InventorySpecialStockType?: string;
  MaterialBaseUnit?: string;
  MatlWrhsStkQtyInMatlBaseUnit?: string | number;
}

export interface MaterialStockLine {
  material: string;
  plant: string;
  storageLocation: string;
  batch: string;
  supplier: string;
  customer: string;
  inventoryStockType: string;
  inventorySpecialStockType: string;
  materialBaseUnit: string;
  quantity: number;
}

export interface MaterialStockSummary {
  material: string;
  materialName?: string;
  plant: string;
  storageLocation: string;
  baseUnit: string;
  unrestrictedQty: number;
  qualityInspectionQty: number;
  blockedQty: number;
  availableQty: number;
  totalQty: number;
  batchCount: number;
}

export interface CrossSlocSummary {
  material: string;
  materialName?: string;
  plant: string;
  storageLocation: string;
  baseUnit: string;
  unrestrictedQty: number;
  qualityInspectionQty: number;
  blockedQty: number;
  availableQty: number;
  totalQty: number;
}

export interface MaterialStockSearchFilters {
  material?: string;
  plant?: string;
  storageLocation?: string;
  batch?: string;
  fertOnly?: boolean;
}

export function toStockQuantity(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapMaterialStockLine(row: MaterialStockRawRow): MaterialStockLine {
  return {
    material: row.Material ?? '',
    plant: row.Plant ?? '',
    storageLocation: row.StorageLocation ?? '',
    batch: row.Batch ?? '',
    supplier: row.Supplier ?? '',
    customer: row.Customer ?? '',
    inventoryStockType: row.InventoryStockType ?? '',
    inventorySpecialStockType: row.InventorySpecialStockType ?? '',
    materialBaseUnit: row.MaterialBaseUnit ?? '',
    quantity: toStockQuantity(row.MatlWrhsStkQtyInMatlBaseUnit),
  };
}

export function getStockTypeLabel(type: string | undefined): string {
  if (!type) return '-';
  const map: Record<string, string> = {
    [STOCK_TYPE_UNRESTRICTED]: '非限制',
    [STOCK_TYPE_QUALITY]: '质检',
    [STOCK_TYPE_BLOCKED]: '冻结',
    [STOCK_TYPE_IN_TRANSIT]: '在途',
  };
  return map[type] ?? type;
}

export function applyStockTypeToSummary(
  summary: Pick<
    MaterialStockSummary,
    'unrestrictedQty' | 'qualityInspectionQty' | 'blockedQty' | 'availableQty' | 'totalQty'
  >,
  stockType: string,
  quantity: number
): void {
  summary.totalQty += quantity;
  if (stockType === STOCK_TYPE_UNRESTRICTED) {
    summary.unrestrictedQty += quantity;
    summary.availableQty += quantity;
  } else if (stockType === STOCK_TYPE_QUALITY) {
    summary.qualityInspectionQty += quantity;
  } else if (stockType === STOCK_TYPE_BLOCKED) {
    summary.blockedQty += quantity;
  } else {
    // Unknown types: match Python fallback — count toward available
    summary.availableQty += quantity;
  }
}

/** Aggregate by material + plant + storage location (matches Python _aggregate_lines). */
export function aggregateMaterialStock(lines: MaterialStockLine[]): MaterialStockSummary[] {
  const buckets = new Map<string, MaterialStockSummary>();
  const batchKeys = new Map<string, Set<string>>();

  for (const line of lines) {
    const key = `${line.material}|${line.plant}|${line.storageLocation}`;
    let summary = buckets.get(key);
    if (!summary) {
      summary = {
        material: line.material,
        plant: line.plant,
        storageLocation: line.storageLocation,
        baseUnit: line.materialBaseUnit,
        unrestrictedQty: 0,
        qualityInspectionQty: 0,
        blockedQty: 0,
        availableQty: 0,
        totalQty: 0,
        batchCount: 0,
      };
      buckets.set(key, summary);
      batchKeys.set(key, new Set());
    }
    if (!summary.baseUnit && line.materialBaseUnit) {
      summary.baseUnit = line.materialBaseUnit;
    }

    applyStockTypeToSummary(summary, line.inventoryStockType, line.quantity);

    const batches = batchKeys.get(key)!;
    const batchKey = line.batch || '(no-batch)';
    batches.add(batchKey);
    summary.batchCount = batches.size;
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.availableQty - a.availableQty || a.material.localeCompare(b.material)
  );
}

/** Cross storage-location view for a single material (指定物料跨库位). */
export function aggregateCrossSloc(
  lines: MaterialStockLine[],
  material: string,
  plant?: string
): CrossSlocSummary[] {
  const normalized = material.trim();
  if (!normalized) return [];

  const filtered = lines.filter(
    (line) =>
      line.material === normalized && (!plant || plant === 'all' || line.plant === plant)
  );

  const buckets = new Map<string, CrossSlocSummary>();
  for (const line of filtered) {
    const key = `${line.plant}|${line.storageLocation}`;
    let summary = buckets.get(key);
    if (!summary) {
      summary = {
        material: line.material,
        plant: line.plant,
        storageLocation: line.storageLocation,
        baseUnit: line.materialBaseUnit,
        unrestrictedQty: 0,
        qualityInspectionQty: 0,
        blockedQty: 0,
        availableQty: 0,
        totalQty: 0,
      };
      buckets.set(key, summary);
    }
    if (!summary.baseUnit && line.materialBaseUnit) {
      summary.baseUnit = line.materialBaseUnit;
    }
    applyStockTypeToSummary(summary, line.inventoryStockType, line.quantity);
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.availableQty - a.availableQty || a.storageLocation.localeCompare(b.storageLocation)
  );
}

export function filterLowStock(
  summaries: MaterialStockSummary[],
  threshold: number = DEFAULT_LOW_STOCK_THRESHOLD
): MaterialStockSummary[] {
  return summaries.filter((s) => s.availableQty < threshold);
}

export function buildMaterialStockFilter(filters: MaterialStockSearchFilters): string | undefined {
  const parts: string[] = [];

  if (filters.material?.trim()) {
    parts.push(`Material eq '${odataEscape(filters.material.trim())}'`);
  }
  if (filters.plant && filters.plant !== 'all') {
    parts.push(`Plant eq '${odataEscape(filters.plant.trim())}'`);
  }
  if (filters.storageLocation && filters.storageLocation !== 'all') {
    parts.push(`StorageLocation eq '${odataEscape(filters.storageLocation.trim())}'`);
  }
  if (filters.batch?.trim()) {
    parts.push(`Batch eq '${odataEscape(filters.batch.trim())}'`);
  }

  return parts.length > 0 ? parts.join(' and ') : undefined;
}

export function buildFertMaterialFilter(codes: string[]): string | undefined {
  const valid = codes.map((c) => c.trim()).filter(Boolean);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) {
    return `Material eq '${odataEscape(valid[0])}'`;
  }
  const orClause = valid.map((code) => `Material eq '${odataEscape(code)}'`).join(' or ');
  return `(${orClause})`;
}

export function mergeMaterialStockFilters(...clauses: (string | undefined)[]): string | undefined {
  const parts = clauses.filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' and ') : undefined;
}

export function filterLinesByMaterialCodes(
  lines: MaterialStockLine[],
  codes: Set<string>
): MaterialStockLine[] {
  if (codes.size === 0) return lines;
  return lines.filter((line) => codes.has(line.material));
}

export const MATERIAL_STOCK_LINE_SELECT =
  'Material,Plant,StorageLocation,Batch,Supplier,Customer,InventoryStockType,InventorySpecialStockType,MaterialBaseUnit,MatlWrhsStkQtyInMatlBaseUnit';

export const AVAILABLE_STOCK_HELPER_TEXT =
  '可用库存 = 非限制库存（01）；质检（02）与冻结（03）不计入可用。';

export function defaultMaterialStockFilters(): MaterialStockSearchFilters {
  return {
    plant: SAP_DEFAULTS.plant,
    storageLocation: SAP_DEFAULTS.storageLocation,
    fertOnly: false,
  };
}

export function formatQty(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
