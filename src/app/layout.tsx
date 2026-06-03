import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'OTD助手 - SAP ERP数据查询系统',
  description: 'SAP S/4HANA Cloud 数据查询助手，支持产品、销售订单、生产订单、库存等8大业务模块',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
