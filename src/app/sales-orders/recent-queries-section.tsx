'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatRecentQueryTime,
  loadRecentFromLocalStorage,
  mergeRecentRecords,
  saveRestorePayload,
  SALES_ORDER_RESTORE_URL_FLAG,
  type SalesOrderRecentQueryRecord,
} from '@/lib/sap-sales-order-recent-queries';
import { History, ArrowRight, Inbox, AlertCircle, CheckCircle2 } from 'lucide-react';

export function RecentSalesQueriesSection() {
  const router = useRouter();
  const [records, setRecords] = useState<SalesOrderRecentQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let server: SalesOrderRecentQueryRecord[] = [];
      try {
        const res = await fetch('/api/audit/recent-sales-orders?limit=5', { credentials: 'include' });
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          server = json.data;
        }
      } catch {
        // fallback to local only
      }
      if (!cancelled) {
        const local = loadRecentFromLocalStorage();
        setRecords(mergeRecentRecords(server, local, 5));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openRecord = (record: SalesOrderRecentQueryRecord) => {
    saveRestorePayload(record.restore);
    router.push(`/sales-orders?${SALES_ORDER_RESTORE_URL_FLAG}=1`);
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-slate-700">最近查询</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">销售订单</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="py-10 flex flex-col items-center text-center">
            <Inbox className="w-9 h-9 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">暂无最近查询记录</p>
            <p className="text-xs text-slate-400 mt-1">
              在销售订单页查询后，将在此显示最近 5 条记录
            </p>
            <Link
              href="/sales-orders"
              className="text-xs text-blue-600 hover:underline mt-3 inline-flex items-center gap-1"
            >
              前往销售订单
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {records.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() => openRecord(record)}
                className="w-full text-left"
              >
                <Card className="border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <History className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400 tabular-nums">
                              {formatRecentQueryTime(record.timestamp)}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {record.queryTypeLabel}
                            </Badge>
                            {record.success ? (
                              <Badge variant="secondary" className="text-[10px] h-5 gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                成功
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 gap-0.5 border-red-200 text-red-700"
                              >
                                <AlertCircle className="w-3 h-3" />
                                失败
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 mt-1 line-clamp-2">
                            {record.conditionSummary}
                          </p>
                          {record.errorSummary && (
                            <p className="text-xs text-red-600 mt-1 line-clamp-1">
                              {record.errorSummary}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {record.success && record.resultCount != null && (
                          <span className="text-xs font-mono text-slate-600 tabular-nums">
                            {record.resultCount} 条
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-300 mt-2 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
