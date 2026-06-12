'use client';

import { useState, useEffect } from 'react';

export type ViewMode = 'card' | 'table';

/**
 * 响应式视图模式 Hook
 * - PC/Desktop (≥768px): 默认表格视图
 * - Mobile (<768px): 默认卡片视图
 * - 用户手动切换后保持用户选择
 */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // SSR 时默认表格
    if (typeof window === 'undefined') return 'table';
    // 客户端根据屏幕宽度判断
    return window.innerWidth >= 768 ? 'table' : 'card';
  });

  // 监听窗口大小变化（可选，用于动态切换）
  useEffect(() => {
    const handleResize = () => {
      // 只在用户没有手动切换过时自动调整
      // 这里简化处理：不自动切换，保持用户选择
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return [viewMode, setViewMode];
}
