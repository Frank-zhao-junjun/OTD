'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Truck,
  Receipt,
  CalendarClock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  SALES_ORDER_PRESET_LIST,
  type SalesOrderPresetId,
} from '@/lib/sap-sales-order-presets';
import {
  fetchAllSalesOrderPresetCounts,
  type PresetCountResult,
} from '@/lib/sap-sales-order-preset-count';

const QUICK_VIEW_ICONS = {
  open: ClipboardList,
  'shipped-unbilled': Truck,
  'invoiced-7d': Receipt,
  'delivery-7d': CalendarClock,
} as const;

const QUICK_VIEW_STYLES = {
  open: { bgLight: 'bg-blue-50', textColor: 'text-blue-600' },
  'shipped-unbilled': { bgLight: 'bg-teal-50', textColor: 'text-teal-600' },
  'invoiced-7d': { bgLight: 'bg-rose-50', textColor: 'text-rose-600' },
  'delivery-7d': { bgLight: 'bg-amber-50', textColor: 'text-amber-600' },
} as const;

function PresetCountDisplay({
  state,
  loading,
}: {
  state: PresetCountResult | undefined;
  loading: boolean;
}) {
  if (loading || !state) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Skeleton className="h-8 w-14 rounded-md" />
        <span className="text-[10px] text-slate-400">加载中</span>
      </div>
    );
  }

  if (state.error || state.count == null) {
    return (
      <div className="flex flex-col items-end shrink-0" title={state.error}>
        <span className="text-2xl font-bold font-mono tabular-nums text-slate-300">--</span>
        {state.error && (
          <span className="text-[10px] text-red-500 max-w-[88px] text-right line-clamp-2">
            数量不可用
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end shrink-0">
      <span className="text-2xl font-bold font-mono tabular-nums text-slate-800">
        {state.count.toLocaleString()}
      </span>
      <span className="text-[10px] text-slate-400">
        {state.estimated ? '约 · 估算' : '单'}
      </span>
    </div>
  );
}

export function HomeQuickViewsSection() {
  const [counts, setCounts] = useState<Partial<Record<SalesOrderPresetId, PresetCountResult>>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchAllSalesOrderPresetCounts();
      setCounts(data);
    } catch {
      const empty: Partial<Record<SalesOrderPresetId, PresetCountResult>> = {};
      for (const view of SALES_ORDER_PRESET_LIST) {
        empty[view.id] = { count: null, estimated: false, error: '加载失败' };
      }
      setCounts(empty);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCounts(false);
  }, [loadCounts]);

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-700">快捷视图</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {SALES_ORDER_PRESET_LIST.length} 个
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-slate-500"
          disabled={loading || refreshing}
          onClick={() => void loadCounts(true)}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          刷新数量
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {SALES_ORDER_PRESET_LIST.map((view) => {
          const Icon = QUICK_VIEW_ICONS[view.id];
          const style = QUICK_VIEW_STYLES[view.id];
          const countState = counts[view.id];
          return (
            <Link key={view.id} href={view.href} className="block h-full">
              <Card className="group hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer h-full border-slate-200">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-lg ${style.bgLight} flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`w-5 h-5 ${style.textColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm md:text-base">
                          {view.label}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {view.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <PresetCountDisplay state={countState} loading={loading || refreshing} />
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        数量为只读统计，点击卡片或数量区域均可进入列表；刷新仅重新查询计数，不修改 SAP 数据。
      </p>
    </section>
  );
}
