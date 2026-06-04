import { NextRequest, NextResponse } from 'next/server';

/**
 * DB模糊搜索API
 * 在本地DB表中按名称模糊搜索，返回匹配的精确代码
 * 
 * GET /api/sap/search?type=product&q=电缆  → [{product:"TG11", productDescription:"电缆..."}]
 * GET /api/sap/search?type=customer&q=公司  → [{customer:"1000001", customerName:"xxx公司"}]
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || '';
  const q = searchParams.get('q') || '';

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const searchTerm = `%${q.trim()}%`;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    if (type === 'product') {
      // 搜索产品表：分别按产品编号和产品描述模糊搜索，合并去重
      const [byCode, byDesc] = await Promise.all([
        supabase.from('products').select('product, product_description, language').ilike('product', searchTerm).limit(50),
        supabase.from('products').select('product, product_description, language').ilike('product_description', searchTerm).limit(50),
      ]);

      if (byCode.error) console.error('[Search] Product by code error:', byCode.error.message);
      if (byDesc.error) console.error('[Search] Product by desc error:', byDesc.error.message);

      // 合并并按产品编号分组
      const grouped = new Map<string, Record<string, string>>();
      for (const row of [...(byCode.data || []), ...(byDesc.data || [])]) {
        if (!grouped.has(row.product)) {
          grouped.set(row.product, { product: row.product } as Record<string, string>);
        }
        const entry = grouped.get(row.product)!;
        if (row.product_description) {
          const lang = row.language || 'ZH';
          if (!entry[`desc_${lang}`]) entry[`desc_${lang}`] = row.product_description;
        }
      }

      const results = Array.from(grouped.values()).map(item => ({
        product: item.product,
        productDescription: item.desc_ZH || item.desc_EN || '',
        enDescription: item.desc_EN || '',
      }));

      return NextResponse.json({ success: true, data: results });

    } else if (type === 'customer') {
      // 搜索客户表：分别按客户编号、名称、全名模糊搜索，合并去重
      const [byCode, byName, byFullName] = await Promise.all([
        supabase.from('customers').select('customer, customer_name, customer_full_name').ilike('customer', searchTerm).limit(50),
        supabase.from('customers').select('customer, customer_name, customer_full_name').ilike('customer_name', searchTerm).limit(50),
        supabase.from('customers').select('customer, customer_name, customer_full_name').ilike('customer_full_name', searchTerm).limit(50),
      ]);

      if (byCode.error) console.error('[Search] Customer by code error:', byCode.error.message);
      if (byName.error) console.error('[Search] Customer by name error:', byName.error.message);
      if (byFullName.error) console.error('[Search] Customer by full name error:', byFullName.error.message);

      // 合并去重
      const seen = new Set<string>();
      const results: Array<{ customer: string; customerName: string; customerFullName: string }> = [];
      for (const row of [...(byCode.data || []), ...(byName.data || []), ...(byFullName.data || [])]) {
        if (!seen.has(row.customer)) {
          seen.add(row.customer);
          results.push({
            customer: row.customer,
            customerName: row.customer_name || '',
            customerFullName: row.customer_full_name || '',
          });
        }
      }

      return NextResponse.json({ success: true, data: results });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid type. Use "product" or "customer".' }, { status: 400 });
    }

  } catch (err) {
    console.error('[Search] Error:', err);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
