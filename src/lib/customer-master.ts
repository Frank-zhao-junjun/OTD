/** SAP Business Partner helpers for customer master enrichment */

export interface BusinessPartnerAddress {
  BusinessPartner?: string;
  AddressID?: string;
  FullName?: string;
  Language?: string;
  CityName?: string;
  Country?: string;
  Region?: string;
  StreetName?: string;
  PostalCode?: string;
}

export interface BusinessPartnerRecord {
  BusinessPartner: string;
  BusinessPartnerName?: string;
  BusinessPartnerFullName?: string;
  BusinessPartnerType?: string;
  BusinessPartnerCategory?: string;
  IsMarkedForArchiving?: boolean;
  CorrespondenceLanguage?: string;
  OrganizationBPName1?: string;
  PersonFullName?: string;
  FirstName?: string;
  LastName?: string;
  to_BusinessPartnerAddress?: BusinessPartnerAddress[] | { results: BusinessPartnerAddress[] };
  to_BusinessPartnerContact?: BusinessPartnerContactLink[] | { results: BusinessPartnerContactLink[] };
}

export interface BusinessPartnerContactLink {
  RelationshipNumber?: string;
  BusinessPartnerCompany?: string;
  BusinessPartnerPerson?: string;
  RelationshipCategory?: string;
  IsStandardRelationship?: boolean;
  ValidityStartDate?: string;
  ValidityEndDate?: string;
}

export interface CustomerContactDetail {
  relationshipNumber: string;
  personBp: string;
  personName: string;
  functionName?: string;
  departmentName?: string;
  email?: string;
  phone?: string;
  fax?: string;
  isStandard?: boolean;
}

export interface CustomerAddressSummary {
  city?: string;
  country?: string;
  region?: string;
  street?: string;
  postalCode?: string;
}

const COUNTRY_LABELS: Record<string, string> = {
  CN: '中国',
  US: '美国',
  DE: '德国',
  JP: '日本',
  GB: '英国',
  FR: '法国',
  KR: '韩国',
  SG: '新加坡',
  HK: '中国香港',
  TW: '中国台湾',
};

const BP_CATEGORY_LABELS: Record<string, string> = {
  '1': '个人',
  '2': '组织',
};

export function normalizeODataList<T>(data: T[] | { results: T[] } | undefined | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return [];
}

export function pickPrimaryAddress(addresses: BusinessPartnerAddress[]): BusinessPartnerAddress | null {
  if (addresses.length === 0) return null;
  const zh = addresses.find((a) => a.Language === 'ZH');
  if (zh) return zh;
  const withCity = addresses.find((a) => a.CityName || a.Country);
  return withCity || addresses[0];
}

export function summarizeAddress(addresses: BusinessPartnerAddress[]): CustomerAddressSummary {
  const primary = pickPrimaryAddress(addresses);
  if (!primary) return {};
  return {
    city: primary.CityName || undefined,
    country: primary.Country || undefined,
    region: primary.Region || undefined,
    street: primary.StreetName || undefined,
    postalCode: primary.PostalCode || undefined,
  };
}

export function formatCountryRegion(country?: string, region?: string): string {
  if (!country && !region) return '-';
  const countryLabel = country ? (COUNTRY_LABELS[country] ? `${COUNTRY_LABELS[country]} (${country})` : country) : '';
  if (countryLabel && region) return `${countryLabel} / ${region}`;
  return countryLabel || region || '-';
}

export function formatBusinessPartnerType(type?: string, category?: string): string {
  const parts: string[] = [];
  if (type) parts.push(type);
  if (category) {
    const label = BP_CATEGORY_LABELS[category];
    parts.push(label ? `${label} (${category})` : category);
  }
  return parts.length > 0 ? parts.join(' · ') : '-';
}

export function formatArchivingFlag(flag?: boolean): string {
  if (flag === true) return '是';
  if (flag === false) return '否';
  return '-';
}

function buildOrFilter(field: string, values: string[]): string {
  return values.map((v) => `${field} eq '${v.replace(/'/g, "''")}'`).join(' or ');
}

async function fetchSapJson<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) return [];
  return (json.data || []) as T[];
}

/** Batch-fetch primary address (city/country) for a page of customers */
export async function fetchAddressMapForCustomers(
  customerIds: string[],
): Promise<Record<string, CustomerAddressSummary>> {
  const ids = [...new Set(customerIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const filter = encodeURIComponent(buildOrFilter('BusinessPartner', ids));
  const rows = await fetchSapJson<BusinessPartnerAddress>(
    `/api/sap/API_BUSINESS_PARTNER/A_BusinessPartnerAddress?sap_direct=true&filter=${filter}&top=500&select=BusinessPartner,CityName,Country,Region,StreetName,PostalCode,Language`,
  );

  const grouped = new Map<string, BusinessPartnerAddress[]>();
  for (const row of rows) {
    const bp = row.BusinessPartner;
    if (!bp) continue;
    const list = grouped.get(bp) || [];
    list.push(row);
    grouped.set(bp, list);
  }

  const result: Record<string, CustomerAddressSummary> = {};
  for (const [bp, addresses] of grouped) {
    result[bp] = summarizeAddress(addresses);
  }
  return result;
}

/** Fetch BP header + addresses for a single customer (BusinessPartner = Customer) */
export async function fetchBusinessPartnerDetail(customerId: string): Promise<BusinessPartnerRecord | null> {
  const expand = encodeURIComponent('to_BusinessPartnerAddress,to_BusinessPartnerContact');
  const select = encodeURIComponent(
    'BusinessPartner,BusinessPartnerName,BusinessPartnerFullName,BusinessPartnerType,BusinessPartnerCategory,IsMarkedForArchiving,CorrespondenceLanguage,OrganizationBPName1,PersonFullName,Customer,to_BusinessPartnerAddress,to_BusinessPartnerContact',
  );
  const query = `sap_direct=true&expand=${expand}&select=${select}`;

  let rows = await fetchSapJson<BusinessPartnerRecord>(
    `/api/sap/API_BUSINESS_PARTNER/A_BusinessPartner?id=${encodeURIComponent(customerId)}&${query}`,
  );
  if (!rows[0]) {
    const filter = encodeURIComponent(`Customer eq '${customerId.replace(/'/g, "''")}'`);
    rows = await fetchSapJson<BusinessPartnerRecord>(
      `/api/sap/API_BUSINESS_PARTNER/A_BusinessPartner?${query}&filter=${filter}&top=1`,
    );
  }
  return rows[0] || null;
}

interface FuncAndDeptRow {
  RelationshipNumber?: string;
  BusinessPartnerCompany?: string;
  BusinessPartnerPerson?: string;
  ContactPersonFunctionName?: string;
  ContactPersonDepartmentName?: string;
  EmailAddress?: string;
  PhoneNumber?: string;
  FaxNumber?: string;
  IsStandardRelationship?: boolean;
}

/** Fetch contact persons with function, department, phone, email */
export async function fetchCustomerContacts(customerId: string): Promise<CustomerContactDetail[]> {
  const filter = encodeURIComponent(`BusinessPartnerCompany eq '${customerId.replace(/'/g, "''")}'`);
  const rows = await fetchSapJson<FuncAndDeptRow>(
    `/api/sap/API_BUSINESS_PARTNER/A_BPContactToFuncAndDept?sap_direct=true&filter=${filter}&top=50`,
  );
  if (rows.length === 0) return [];

  const personIds = [...new Set(rows.map((r) => r.BusinessPartnerPerson).filter(Boolean))] as string[];
  const nameMap: Record<string, string> = {};
  if (personIds.length > 0) {
    const personFilter = encodeURIComponent(buildOrFilter('BusinessPartner', personIds));
    const persons = await fetchSapJson<BusinessPartnerRecord>(
      `/api/sap/API_BUSINESS_PARTNER/A_BusinessPartner?sap_direct=true&filter=${personFilter}&top=${personIds.length}&select=BusinessPartner,PersonFullName,BusinessPartnerName,FirstName,LastName`,
    );
    for (const p of persons) {
      const name =
        p.PersonFullName ||
        [p.FirstName, p.LastName].filter(Boolean).join(' ') ||
        p.BusinessPartnerName ||
        p.BusinessPartner;
      nameMap[p.BusinessPartner] = name;
    }
  }

  return rows.map((row) => ({
    relationshipNumber: row.RelationshipNumber || '-',
    personBp: row.BusinessPartnerPerson || '-',
    personName: (row.BusinessPartnerPerson && nameMap[row.BusinessPartnerPerson]) || row.BusinessPartnerPerson || '-',
    functionName: row.ContactPersonFunctionName || undefined,
    departmentName: row.ContactPersonDepartmentName || undefined,
    email: row.EmailAddress || undefined,
    phone: row.PhoneNumber || undefined,
    fax: row.FaxNumber || undefined,
    isStandard: row.IsStandardRelationship,
  }));
}
