'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BillingDocHeader {
  BillingDocument: string;
  SoldToParty: string;
  SoldToPartyName?: string;
  BillingDocumentDate: string;
  BillingDocumentType?: string;
  TransactionCurrency: string;
  TotalNetAmount?: string;
  OverallBillingStatus?: string;
  AccountingDocumentType?: string;
  FiscalYear?: string;
  CompanyCode?: string;
}

interface BillingDocItem {
  BillingDocument: string;
  BillingDocumentItem: string;
  ReferenceSDDocument: string;
  ReferenceSDDocumentItem: string;
  Material: string;
  BillingDocumentItemText: string;
  BillingQuantity: string;
  BillingQuantityUnit: string;
  NetAmount: string;
  TaxAmount: string;
  TransactionCurrency: string;
}

// SAP /Date(xxx)/ timestamp parser
function parseSapDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) return new Date(parseInt(match[1])).toLocaleDateString('zh-CN');
  return dateStr;
}

// Billing type display
const BILLING_TYPE_MAP: Record<string, string> = {
  'F1': '发票',
  'F2': '发票',
  'S1': '取消发票',
  'S2': '取消发票',
  'L2': '交货单',
  'RE': '退货发票',
  'G2': '贷记凭证',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'A': { label: '已完成', variant: 'default' },
  'B': { label: '处理中', variant: 'secondary' },
  'C': { label: '已取消', variant: 'destructive' },
};

export default function BillingDocumentPage() {
  const [billingDocs, setBillingDocs] = useState<BillingDocHeader[]>([]);
  const [items, setItems] = useState<Record<string, BillingDocItem[]>>({});
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Search params
  const [billingDocNo, setBillingDocNo] = useState('');
  const [soldToParty, setSoldToParty] = useState('');
  const [billingType, setBillingType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const fetchBillingDocs = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    setError(null);

    try {
      const filters: string[] = [];

      if (billingDocNo) {
        filters.push(`BillingDocument eq '${billingDocNo}'`);
      }
      if (soldToParty) {
        filters.push(`SoldToParty eq '${soldToParty}'`);
      }
      if (billingType) {
        filters.push(`BillingDocumentType eq '${billingType}'`);
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filters.push(`BillingDocumentDate ge datetime'${fromDate.toISOString()}'`);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        filters.push(`BillingDocumentDate le datetime'${toDate.toISOString()}'`);
      }

      const params = new URLSearchParams({
        top: pageSize.toString(),
        skip: (pageNum * pageSize).toString(),
        select: 'BillingDocument,SoldToParty,BillingDocumentDate,BillingDocumentType,TransactionCurrency,TotalNetAmount,OverallBillingStatus,CompanyCode',
        orderby: 'BillingDocument desc',
      });

      if (filters.length > 0) {
        params.set('filter', filters.join(' and '));
      }

      const res = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?${params}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || '查询失败');
      }

      setBillingDocs(json.data || []);
      setTotalCount(json.count || json.data?.length || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败');
      setBillingDocs([]);
    } finally {
      setLoading(false);
    }
  }, [billingDocNo, soldToParty, billingType, dateFrom, dateTo]);

  const fetchItems = useCallback(async (billingDoc: string) => {
    try {
      const params = new URLSearchParams({
        filter: `BillingDocument eq '${billingDoc}'`,
        select: 'BillingDocument,BillingDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem,Material,BillingDocumentItemText,BillingQuantity,BillingQuantityUnit,NetAmount,TaxAmount,TransactionCurrency',
      });

      const res = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem?${params}`);
      const json = await res.json();

      if (json.success) {
        setItems(prev => ({ ...prev, [billingDoc]: json.data || [] }));
      }
    } catch {
      // silently fail for items
    }
  }, []);

  const handleExpand = (doc: string) => {
    if (expandedDoc === doc) {
      setExpandedDoc(null);
    } else {
      setExpandedDoc(doc);
      if (!items[doc]) {
        fetchItems(doc);
      }
    }
  };

  const handleSearch = () => fetchBillingDocs(0);
  const handleReset = () => {
    setBillingDocNo('');
    setSoldToParty('');
    setBillingType('');
    setDateFrom('');
    setDateTo('');
    setBillingDocs([]);
    setItems({});
    setExpandedDoc(null);
    setError(null);
    setTotalCount(0);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">开票单据</h1>
        <p className="text-sm text-slate-500 mt-1">API_BILLING_DOCUMENT_SRV (V2) | 查询SAP开票凭证</p>
      </div>

      {/* Search Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">查询条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">开票单号</label>
              <Input
                placeholder="输入开票单号"
                value={billingDocNo}
                onChange={e => setBillingDocNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">客户编号</label>
              <Input
                placeholder="输入售达方编号"
                value={soldToParty}
                onChange={e => setSoldToParty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">开票类型</label>
              <Select value={billingType} onValueChange={setBillingType}>
                <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="F1">F1 - 发票</SelectItem>
                  <SelectItem value="F2">F2 - 发票</SelectItem>
                  <SelectItem value="S1">S1 - 取消</SelectItem>
                  <SelectItem value="S2">S2 - 取消</SelectItem>
                  <SelectItem value="L2">L2 - 交货</SelectItem>
                  <SelectItem value="RE">RE - 退货</SelectItem>
                  <SelectItem value="G2">G2 - 贷记</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">开票日期(起)</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">开票日期(止)</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? '查询中...' : '查询'}
            </Button>
            <Button variant="outline" onClick={handleReset}>重置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {billingDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                查询结果 ({totalCount} 条)
              </CardTitle>
              <div className="text-xs text-slate-400">
                第 {page + 1} / {totalPages} 页
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>开票单号</TableHead>
                  <TableHead>售达方</TableHead>
                  <TableHead>开票类型</TableHead>
                  <TableHead>开票日期</TableHead>
                  <TableHead>货币</TableHead>
                  <TableHead>总金额</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingDocs.map((doc) => (
                  <>
                    <TableRow
                      key={doc.BillingDocument}
                      className="cursor-pointer hover:bg-blue-50/50"
                      onClick={() => handleExpand(doc.BillingDocument)}
                    >
                      <TableCell className="text-center">
                        <span className="text-xs text-slate-400">
                          {expandedDoc === doc.BillingDocument ? '▼' : '▶'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-blue-700">
                        {doc.BillingDocument}
                      </TableCell>
                      <TableCell>
                        <div>{doc.SoldToParty}</div>
                        {doc.SoldToPartyName && (
                          <div className="text-xs text-slate-400">{doc.SoldToPartyName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {doc.BillingDocumentType || '-'}
                          {doc.BillingDocumentType && BILLING_TYPE_MAP[doc.BillingDocumentType] &&
                            ` ${BILLING_TYPE_MAP[doc.BillingDocumentType]}`}
                        </Badge>
                      </TableCell>
                      <TableCell>{parseSapDate(doc.BillingDocumentDate)}</TableCell>
                      <TableCell>{doc.TransactionCurrency}</TableCell>
                      <TableCell className="text-right font-mono">
                        {doc.TotalNetAmount ? parseFloat(doc.TotalNetAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell>
                        {doc.OverallBillingStatus && STATUS_MAP[doc.OverallBillingStatus] ? (
                          <Badge variant={STATUS_MAP[doc.OverallBillingStatus].variant}>
                            {STATUS_MAP[doc.OverallBillingStatus].label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{doc.OverallBillingStatus || '-'}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedDoc === doc.BillingDocument && (
                      <TableRow key={`${doc.BillingDocument}-items`}>
                        <TableCell colSpan={8} className="bg-slate-50 p-4">
                          <div className="text-xs font-semibold text-slate-500 mb-2">
                            行项目明细
                          </div>
                          {items[doc.BillingDocument] ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>行号</TableHead>
                                  <TableHead>物料</TableHead>
                                  <TableHead>描述</TableHead>
                                  <TableHead>参考销售订单</TableHead>
                                  <TableHead>开票数量</TableHead>
                                  <TableHead>净金额</TableHead>
                                  <TableHead>税额</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items[doc.BillingDocument].map((item) => (
                                  <TableRow key={`${item.BillingDocument}-${item.BillingDocumentItem}`}>
                                    <TableCell className="font-mono">{item.BillingDocumentItem}</TableCell>
                                    <TableCell className="font-mono">{item.Material}</TableCell>
                                    <TableCell>{item.BillingDocumentItemText}</TableCell>
                                    <TableCell className="font-mono text-blue-600">
                                      {item.ReferenceSDDocument}-{item.ReferenceSDDocumentItem}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {parseFloat(item.BillingQuantity).toLocaleString()} {item.BillingQuantityUnit}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                      {parseFloat(item.NetAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                      {parseFloat(item.TaxAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center text-sm text-slate-400 py-4">加载中...</div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => fetchBillingDocs(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-slate-500">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => fetchBillingDocs(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && billingDocs.length === 0 && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-slate-500 text-sm">输入查询条件后点击"查询"获取开票单据</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
