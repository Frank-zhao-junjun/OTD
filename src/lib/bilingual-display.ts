export interface ProductDescriptionRow {
  Language?: string;
  ProductDescription?: string;
}

export interface CustomerNameFields {
  Customer?: string;
  CustomerName?: string;
  CustomerFullName?: string;
  BPCustomerName?: string;
  BPCustomerFullName?: string;
}

export interface ProductWithDescription {
  Product: string;
  to_Description?: { results: ProductDescriptionRow[] } | ProductDescriptionRow[];
}

export interface CustomerRecord extends CustomerNameFields {
  Customer: string;
}

/** Merge zh / en with " / "; skip duplicate parts. */
export function formatBilingual(
  zh?: string | null,
  en?: string | null,
  fallback = '',
): string {
  const z = zh?.trim() || '';
  const e = en?.trim() || '';
  if (z && e && z !== e) return `${z} / ${e}`;
  return z || e || fallback;
}

export function normalizeExpand<T>(data: { results: T[] } | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return [];
}

function pickDescriptionByLang(descs: ProductDescriptionRow[], lang: string): string {
  const upper = lang.toUpperCase();
  const row = descs.find((d) => (d.Language || '').toUpperCase() === upper);
  return row?.ProductDescription?.trim() || '';
}

export function getProductDescriptionParts(
  descriptions: ProductDescriptionRow[] | { results: ProductDescriptionRow[] } | undefined,
  productCode?: string,
): { zh: string; en: string } {
  const descs = normalizeExpand(descriptions);
  const zh = pickDescriptionByLang(descs, 'ZH') || pickDescriptionByLang(descs, '1');
  const en = pickDescriptionByLang(descs, 'EN') || pickDescriptionByLang(descs, 'E');
  const fallback = descs[0]?.ProductDescription?.trim() || productCode || '';
  return {
    zh: zh || (!en ? fallback : ''),
    en,
  };
}

export function formatProductDescription(
  descriptions: ProductDescriptionRow[] | { results: ProductDescriptionRow[] } | undefined,
  productCode?: string,
): string {
  const { zh, en } = getProductDescriptionParts(descriptions, productCode);
  return formatBilingual(zh, en, productCode || '-');
}

export function formatProductDescriptionFromParts(
  zhDesc?: string,
  enDesc?: string,
  code?: string,
): string {
  return formatBilingual(zhDesc, enDesc, code || '-');
}

export function getCustomerNameParts(c: CustomerNameFields): { zh: string; en: string } {
  const zh = c.CustomerName?.trim() || '';
  const en = c.BPCustomerName?.trim() || c.BPCustomerFullName?.trim() || '';
  if (!zh && c.CustomerFullName?.trim()) {
    return { zh: c.CustomerFullName.trim(), en };
  }
  if (!en && c.CustomerFullName?.trim() && c.CustomerFullName.trim() !== zh) {
    return { zh: zh || c.CustomerFullName.trim(), en: c.CustomerFullName.trim() };
  }
  return { zh, en };
}

export function formatCustomerName(c: CustomerNameFields): string {
  const { zh, en } = getCustomerNameParts(c);
  return formatBilingual(zh, en, c.Customer || '-');
}

export function buildProductNameMap(products: ProductWithDescription[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of products) {
    map[p.Product] = formatProductDescription(p.to_Description, p.Product);
  }
  return map;
}

export function buildCustomerNameMap(customers: CustomerRecord[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of customers) {
    map[c.Customer] = formatCustomerName(c);
  }
  return map;
}

export async function fetchProductNameMap(productCodes: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(productCodes.filter(Boolean))];
  if (unique.length === 0) return {};
  const filter = unique.map((c) => `Product eq '${c}'`).join(' or ');
  const params = new URLSearchParams({
    filter,
    top: String(Math.min(unique.length, 200)),
    expand: 'to_Description',
  });
  const res = await fetch(`/api/sap/API_PRODUCT_SRV/A_Product?${params}`);
  const json = await res.json();
  if (!json.success) return {};
  return buildProductNameMap((json.data || []) as ProductWithDescription[]);
}

export async function fetchCustomerNameMap(customerCodes: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(customerCodes.filter(Boolean))];
  if (unique.length === 0) return {};
  const filter = unique.map((c) => `Customer eq '${c}'`).join(' or ');
  const params = new URLSearchParams({
    filter,
    top: String(Math.min(unique.length, 100)),
  });
  const res = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?${params}`);
  const json = await res.json();
  if (!json.success) return {};
  return buildCustomerNameMap((json.data || []) as CustomerRecord[]);
}
