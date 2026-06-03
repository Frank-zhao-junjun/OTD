'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, Search, RotateCcw, AlertCircle, Inbox } from 'lucide-react';

interface MaterialDocItem {
  MaterialDocument: string;
  MaterialDocumentYear: string;
  MaterialDocumentItem: string;
  Material: string;
  MaterialDocumentItemText: string;
  Plant: string;
  StorageLocation: string;
  Batch?: string;
  QuantityInEntryUnit: string;
  EntryUnit: string;
  GoodsMovementType: string;
  MovementTypeText?: string;
  Delivery?: string;
  DeliveryItem?: string;
  ManufacturingOrder?: string;
  PostingDate: string;
  AccountType?: string;
}

// SAP /Date(xxx)/ timestamp parser
function parseSapDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) return new Date(parseInt(match[1])).toLocaleDateString('zh-CN');
  return dateStr;
}

// Goods movement type descriptions
const MOVEMENT_TYPE_MAP: Record<string, { label: string; color: string }> = {
  '101': { label: '收货(生产订单)', color: 'text-green-700 bg-green-50' },
  '102': { label: '取消收货', color: 'text-red-700 bg-red-50' },
  '261': { label: '发料(生产订单)', color: 'text-orange-700 bg-orange-50' },
  '262': { label: '取消发料', color: 'text-red-700 bg-red-50' },
  '601': { label: '发货(销售)', color: 'text-blue-700 bg-blue-50' },
  '602': { label: '取消发货', color: 'text-red-700 bg-red-50' },
  '311': { label: '转储', color: 'text-purple-700 bg-purple-50' },
  '312': { label: '取消转储', color: 'text-red-700 bg-red-50' },
  '561': { label: '期初导入', color: 'text-slate-700 bg-slate-50' },
  '701': { label: '盘盈', color: 'text-green-700 bg-green-50' },
  '702': { label: '盘亏', color: 'text-red-700 bg-red-50' },
};

function getMovementTypeLabel(code: string): string {
  const entry = MOVEMENT_TYPE_MAP[code];
  return entry ? `${code} ${entry.label}` : code;
}

function getMovementTypeColor(code: string): string {
  return MOVEMENT_TYPE_MAP[code]?.color || 'text-slate-700 bg-slate-50';
}

export default function MaterialDocumentPage() {
  const [materialDocs, setMaterialDocs] = useState<MaterialDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Search params
  const [materialDocNo, setMaterialDocNo] = useState('');
  const [material, setMaterial] = useState('');
  const [plant, setPlant] = useState('1010');
  const [movementType, setMovementType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchMaterialDocs = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    setError(null);

    try {
      const filters: string[] = [];

      if (materialDocNo) {
        filters.push(`MaterialDocument eq '${materialDocNo}'`);
      }
      if (material) {
        filters.push(`Material eq '${material}'`);
      }
      if (plant) {
        filters.push(`Plant eq '${plant}'`);
      }
      if (movementType) {
        filters.push(`GoodsMovementType eq '${movementType}'`);
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filters.push(`PostingDate ge datetime'${fromDate.toISOString()}'`);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        filters.push(`PostingDate le datetime'${toDate.toISOString()}'`);
      }

      const params = new URLSearchParams({
        top: pageSize.toString(),
        skip: (pageNum * pageSize).toString(),
        select: 'MaterialDocument,MaterialDocumentYear,MaterialDocumentItem,Material,MaterialDocumentItemText,Plant,StorageLocation,Batch,QuantityInEntryUnit,EntryUnit,GoodsMovementType,Delivery,DeliveryItem,ManufacturingOrder,PostingDate',
        orderby: 'PostingDate desc,MaterialDocument desc',
      });

      if (filters.length > 0) {
        params.set('filter', filters.join(' and '));
      }

      const res = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?${params}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || '查询失败');
      }

      setMaterialDocs(json.data || []);
      setTotalCount(json.count || json.data?.length || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败');
      setMaterialDocs([]);
    } finally {
      setLoading(false);
    }
  }, [materialDocNo, material, plant, movementType, dateFrom, dateTo]);

  const handleSearch = () => fetchMaterialDocs(0);
  const handleReset = () => {
    setMaterialDocNo('');
    setMaterial('');
    setPlant('1010');
    setMovementType('');
    setDateFrom('');
    setDateTo('');
    setMaterialDocs([]);
    setError(null);
    setTotalCount(0);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Group by MaterialDocument for header view
  const docGroups = materialDocs.reduce<Record<string, MaterialDocItem[]>>((acc, item) => {
    const key = `${item.MaterialDocument}-${item.MaterialDocumentYear}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">物料凭证</h1>
        <p className="text-sm text-slate-500 mt-1">API_MATERIAL_DOCUMENT_SRV (V2) | 查询SAP物料移动记录</p>
      </div>

      {/* Search Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">查询条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">物料凭证号</label>
              <Input
                placeholder="输入凭证号"
                value={materialDocNo}
                onChange={e => setMaterialDocNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">物料号</label>
              <Input
                placeholder="输入物料号"
                value={material}
                onChange={e => setMaterial(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">工厂</label>
              <Select value={plant} onValueChange={setPlant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1010">1010</SelectItem>
                  <SelectItem value="">全部</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">移动类型</label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="101">101 收货(生产)</SelectItem>
                  <SelectItem value="261">261 发料(生产)</SelectItem>
                  <SelectItem value="601">601 发货(销售)</SelectItem>
                  <SelectItem value="311">311 转储</SelectItem>
                  <SelectItem value="561">561 期初导入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">过账日期(起)</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">过账日期(止)</label>
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
      {Object.keys(docGroups).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                查询结果 ({totalCount} 条, {Object.keys(docGroups).length} 个凭证)
              </CardTitle>
              <div className="text-xs text-slate-400">
                第 {page + 1} / {Math.max(totalPages, 1)} 页
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Grouped by Material Document */}
            {Object.entries(docGroups).map(([docKey, docItems]) => (
              <div key={docKey} className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
                {/* Document Header */}
                <div className="bg-slate-100 px-4 py-2 flex items-center gap-4 text-sm">
                  <span className="font-semibold text-slate-700">
                    凭证号: {docItems[0].MaterialDocument}
                  </span>
                  <span className="text-slate-500">年度: {docItems[0].MaterialDocumentYear}</span>
                  <span className="text-slate-500">
                    过账日期: {parseSapDate(docItems[0].PostingDate)}
                  </span>
                  <span className="text-slate-500">
                    行数: {docItems.length}
                  </span>
                </div>

                {/* Document Items */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>行号</TableHead>
                      <TableHead>物料</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>工厂</TableHead>
                      <TableHead>库位</TableHead>
                      <TableHead>批次</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>移动类型</TableHead>
                      <TableHead>参考单据</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docItems.map((item, idx) => (
                      <TableRow key={`${docKey}-${idx}`}>
                        <TableCell className="font-mono">{item.MaterialDocumentItem}</TableCell>
                        <TableCell className="font-mono font-medium text-blue-700">{item.Material}</TableCell>
                        <TableCell>{item.MaterialDocumentItemText}</TableCell>
                        <TableCell>{item.Plant}</TableCell>
                        <TableCell>{item.StorageLocation}</TableCell>
                        <TableCell className="font-mono">{item.Batch || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(item.QuantityInEntryUnit).toLocaleString()} {item.EntryUnit}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getMovementTypeColor(item.GoodsMovementType)}`}
                          >
                            {getMovementTypeLabel(item.GoodsMovementType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.Delivery && (
                            <span className="text-blue-600 font-mono text-xs">
                              交货 {item.Delivery}-{item.DeliveryItem}
                            </span>
                          )}
                          {item.ManufacturingOrder && (
                            <span className="text-purple-600 font-mono text-xs">
                              生产 {item.ManufacturingOrder}
                            </span>
                          )}
                          {!item.Delivery && !item.ManufacturingOrder && '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => fetchMaterialDocs(page - 1)}
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
                  onClick={() => fetchMaterialDocs(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && materialDocs.length === 0 && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-slate-500 text-sm">输入查询条件后点击"查询"获取物料凭证</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
