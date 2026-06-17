'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Factory,
  Truck,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  Package,
  Users,
  CornerDownLeft,
  Loader2,
} from 'lucide-react';

interface SearchItem {
  label: string;
  description: string;
  path: string;
  raw: Record<string, unknown>;
}

interface SearchGroup {
  group: string;
  icon: string;
  items: SearchItem[];
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchGroup[];
  totalGroups: number;
  totalItems: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Factory,
  Truck,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  Package,
  Users,
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTotalItems(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) {
      setResults([]);
      setTotalItems(0);
      return;
    }

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          const data: SearchResponse = await res.json();
          if (data.success) {
            setResults(data.results);
            setTotalItems(data.totalItems);
            setSelectedIndex(0);
          }
        }
      } catch {
        // Aborted or network error - ignore
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Flatten all items for keyboard navigation
  const flatItems = results.flatMap((g) => g.items);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          router.push(flatItems[selectedIndex].path);
          onClose();
        }
      }
    },
    [flatItems, selectedIndex, router, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = document.getElementById(`search-item-${selectedIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Will be handled by AppShell
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
          ) : (
            <Search className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
          )}
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--foreground)' }}
            placeholder="搜索销售订单、生产订单、物料、客户..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'var(--accent)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              输入关键词搜索 SAP 业务数据...
            </div>
          ) : loading ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              搜索中...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              未找到匹配结果
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="px-4 py-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                共 {totalItems} 条结果，{results.length} 个分类
              </div>

              {/* Grouped Results */}
              {results.map((group, gi) => {
                const Icon = ICON_MAP[group.icon] || Search;
                return (
                  <div key={gi}>
                    <div
                      className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--muted-foreground)', background: 'var(--background)' }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {group.group}
                      <span className="font-normal normal-case" style={{ color: 'var(--muted-foreground)' }}>
                        ({group.items.length})
                      </span>
                    </div>
                    {group.items.map((item, ii) => {
                      const globalIdx = results.slice(0, gi).reduce((s, g) => s + g.items.length, 0) + ii;
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={`${gi}-${ii}`}
                          id={`search-item-${globalIdx}`}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                            isSelected ? '' : ''
                          }`}
                          style={{
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            color: 'var(--foreground)',
                          }}
                          onClick={() => {
                            router.push(item.path);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.label}</div>
                            <div className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                              {item.description}
                            </div>
                          </div>
                          {isSelected && (
                            <CornerDownLeft className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-[10px]"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
              ↑↓
            </kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
              ↵
            </kbd>
            打开
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded" style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
              ESC
            </kbd>
            关闭
          </span>
        </div>
      </div>
    </div>
  );
}
