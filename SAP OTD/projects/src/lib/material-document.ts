export interface MaterialDocumentHeaderDates {
  documentDate?: string;
  postingDate?: string;
}

/** Fetch DocumentDate / PostingDate from material document headers. */
export async function fetchMaterialDocumentHeaderDates(
  docs: Array<{ MaterialDocument: string; MaterialDocumentYear: string }>,
): Promise<Record<string, MaterialDocumentHeaderDates>> {
  const unique = [...new Map(
    docs.map((d) => [`${d.MaterialDocumentYear}|${d.MaterialDocument}`, d]),
  ).values()];
  if (unique.length === 0) return {};

  const filter = unique
    .map((d) => `(MaterialDocument eq '${d.MaterialDocument}' and MaterialDocumentYear eq '${d.MaterialDocumentYear}')`)
    .join(' or ');
  const params = new URLSearchParams({
    filter,
    top: String(Math.min(unique.length, 200)),
    select: 'MaterialDocument,MaterialDocumentYear,DocumentDate,PostingDate',
  });
  const res = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader?${params}`);
  const json = await res.json();
  if (!json.success) return {};

  const map: Record<string, MaterialDocumentHeaderDates> = {};
  for (const h of json.data as Array<{
    MaterialDocument: string;
    DocumentDate?: string;
    PostingDate?: string;
  }>) {
    map[h.MaterialDocument] = {
      documentDate: h.DocumentDate,
      postingDate: h.PostingDate,
    };
  }
  return map;
}
