'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

const AUTH_PATHS = ['/login', '/register'];

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap auth pages with AppShell
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    return <>{children}</>;
  }
  
  return <AppShell>{children}</AppShell>;
}
