'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab, getSapStatusColor } from '@/components/fiori';
import { FileSpreadsheet, Search, RotateCcw, Inbox } from 'lucide-react';

interface MaterialDocumentItem {
  MaterialDocument: string;
  MaterialDocumentItem: string;
  Material?: string;
  Plant?: string;
  StorageLocation?: string;
  Batch?: string;
  GoodsMovementCode?: string;
  PostingDate?: string;
  Quantity?: string | number;
  BaseUnit?: string;
  MovementType?: string;
  MaterialDocumentItemText?: string;
}

export default function MaterialDocumentsPage() {
  const [documents, setDocuments] = useState<MaterialDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (searchQuery) {
        filterParts.push(`(MaterialDocument eq '${searchQuery}' or Material eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'MaterialDocument,MaterialDocumentItem,Material,Plant,StorageLocation,Batch,PostingDate,Quantity,BaseUnit,MovementType,MaterialDocumentItemText');

      const response = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?${params}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setDocuments(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<FileSpreadsheet className="w-5 h-5" />} title="入库单" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="物料凭证号 / 物料号" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchDocuments} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli"><div className="fiori-oli-bar fiori-oli-bar--neutral" /><div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[120px]" /><Skeleton className="h-3 w-[180px]" /><Skeleton className="h-3 w-[80px]" /></div></div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchDocuments} />
      ) : documents.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {documents.map((doc, idx) => {
            const isInbound = doc.MovementType === '101' || doc.MovementType === '311';
            return (
              <FioriOli
                key={`${doc.MaterialDocument}-${doc.MaterialDocumentItem}-${idx}`}
                barColor={isInbound ? 'success' : 'info'}
                title={`${doc.MaterialDocument}-${doc.MaterialDocumentItem} · ${doc.Material || '-'}`}
                subtitle={`${doc.Plant || '-'} · ${doc.StorageLocation || '-'} · ${doc.PostingDate || '-'}`}
                status={
                  <div className="flex items-center gap-2 mt-0.5">
                    <FioriBadge variant={isInbound ? 'success' : 'info'}>{isInbound ? '入库' : '出库'}</FioriBadge>
                    {doc.Quantity && (
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {Number(doc.Quantity).toLocaleString()} {doc.BaseUnit || ''}
                      </span>
                    )}
                    {doc.MaterialDocumentItemText && (
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{doc.MaterialDocumentItemText}</span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchDocuments} ariaLabel="刷新查询" />
    </div>
  );
}
