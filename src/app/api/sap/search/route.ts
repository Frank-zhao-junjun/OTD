import { NextRequest, NextResponse } from 'next/server';

/**
 * DB模糊搜索API
 * 在本地DB表中按名称模糊搜索，返回匹配的精确代码
 * 
 * GET /api/sap/search?type=product&q=电缆  → {products: [...], customers: []}
 * GET /api/sap/search?type=customer&q=公司  → {products: [], customers: [...]}
 * GET /api/sap/search?type=all&q=电缆      → {products: [...], customers: [...]}
 * 
 * 单据页面搜索流程：输入名称 → 此API获取精确编号 → 用编号过滤单据
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';
  const q = searchParams.get('q') || '';

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ success: true, products: [], customers: [] });
  }

  const searchTerm = `%${q.trim()}%`;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const searchProduct = type === 'product' || type === 'all';
    const searchCustomer = type === 'customer' || type === 'all';

    const [productResult, customerResult] = await Promise.all([
      searchProduct
        ? Promise.all([
            supabase.from('products').select('product, product_description, language').ilike('product', searchTerm).limit(50),
            supabase.from('products').select('product, product_description, language').ilike('product_description', searchTerm).limit(50),
          ])
        : Promise.resolve([null, null]),
      searchCustomer
        ? Promise.all([
            supabase.from('customers').select('customer, customer_name, customer_full_name').ilike('customer', searchTerm).limit(50),
            supabase.from('customers').select('customer, customer_name, customer_full_name').ilike('customer_name', searchTerm).limit(50),
            supabase.from('customers').select('customer, customer_name, customer_full_name').ilike('customer_full_name', searchTerm).limit(50),
          ])
        : Promise.resolve([null, null, null]),
    ]);

    // 处理产品搜索结果
    let products: Array<{ product: string; productDescription: string; enDescription: string }> = [];
    if (searchProduct && productResult) {
      const [byCode, byDesc] = productResult;
      if (byCode?.error) console.error('[Search] Product by code error:', byCode.error.message);
      if (byDesc?.error) console.error('[Search] Product by desc error:', byDesc.error.message);

      const grouped = new Map<string, Record<string, string>>();
      for (const row of [...(byCode?.data || []), ...(byDesc?.data || [])]) {
        if (!grouped.has(row.product)) {
          grouped.set(row.product, { product: row.product } as Record<string, string>);
        }
        const entry = grouped.get(row.product)!;
        if (row.product_description) {
          const lang = row.language || 'ZH';
          if (!entry[`desc_${lang}`]) entry[`desc_${lang}`] = row.product_description;
        }
      }

      products = Array.from(grouped.values()).map(item => ({
        product: item.product,
        productDescription: item.desc_ZH || item.desc_EN || '',
        enDescription: item.desc_EN || '',
      }));
    }

    // 处理客户搜索结果
    const customers: Array<{ customer: string; customerName: string; customerFullName: string }> = [];
    if (searchCustomer && customerResult) {
      const [byCode, byName, byFullName] = customerResult;
      if (byCode?.error) console.error('[Search] Customer by code error:', byCode.error.message);
      if (byName?.error) console.error('[Search] Customer by name error:', byName.error.message);
      if (byFullName?.error) console.error('[Search] Customer by full name error:', byFullName.error.message);

      const seen = new Set<string>();
      for (const row of [...(byCode?.data || []), ...(byName?.data || []), ...(byFullName?.data || [])]) {
        if (!seen.has(row.customer)) {
          seen.add(row.customer);
          customers.push({
            customer: row.customer,
            customerName: row.customer_name || '',
            customerFullName: row.customer_full_name || '',
          });
        }
      }
    }

    return NextResponse.json({ success: true, products, customers });

  } catch (err) {
    console.error('[Search] Error:', err);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
