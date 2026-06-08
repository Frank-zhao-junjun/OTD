'use client';

import { HomeQuickViewsSection } from '@/app/home-quick-views';
import { RecentSalesQueriesSection } from '@/app/sales-orders/recent-queries-section';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">销售工作台</h1>
        <p className="text-slate-500 mt-1 text-xs md:text-sm">
          一键查看常用销售订单视图，跳转后自动应用筛选条件
        </p>
      </div>

      <HomeQuickViewsSection />

      <RecentSalesQueriesSection />
    </div>
  );
}
