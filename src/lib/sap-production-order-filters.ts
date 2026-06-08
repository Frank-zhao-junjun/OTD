import { SAP_DEFAULTS } from '@/lib/sap-service';
import { odataEscape } from '@/lib/sap-api-client';

export interface ProductionOrderSearchFilters {
  productionOrderNo?: string;
  plant?: string;
  material?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export function buildProductionOrderListFilter(filters: ProductionOrderSearchFilters): string {
  const parts: string[] = [];

  if (filters.plant !== 'all') {
    const plant = filters.plant?.trim() || SAP_DEFAULTS.plant;
    parts.push(`ProductionPlant eq '${odataEscape(plant)}'`);
  }

  if (filters.productionOrderNo?.trim()) {
    const po = odataEscape(filters.productionOrderNo.trim());
    parts.push(`ProductionOrder eq '${po}'`);
  }

  if (filters.material?.trim()) {
    const m = odataEscape(filters.material.trim());
    parts.push(`Product eq '${m}'`);
  }

  if (filters.dateFrom) {
    parts.push(`CreationDate ge ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    parts.push(`CreationDate le ${filters.dateTo}`);
  }

  return parts.join(' and ');
}
