'use client';

import { Plus, X } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { cn } from '@/lib/utils';

const METHOD_COLOR: Record<string, string> = {
  GET: '#3fb950',
  POST: '#d29922',
  PUT: '#58a6ff',
  PATCH: '#a371f7',
  DELETE: '#f85149',
  HEAD: '#8a93a6',
  OPTIONS: '#8a93a6',
};

/** Open-request tabs, like Postman: switch, close, and open new tabs. */
export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, newTab } = useApp();

  return (
    <div className="flex items-stretch border-b border-border bg-background overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === activeTabId;
        return (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'group flex min-w-[8rem] max-w-[14rem] cursor-pointer items-center gap-2 border-r border-border px-3 py-1.5 text-sm',
              active ? 'bg-card' : 'hover:bg-accent/40',
            )}
            style={active ? { boxShadow: 'inset 0 -2px 0 var(--accent)' } : undefined}
          >
            <span className="text-[0.6rem] font-bold shrink-0" style={{ color: METHOD_COLOR[t.method] ?? 'var(--muted)' }}>
              {t.method}
            </span>
            <span className="flex-1 truncate text-foreground/90">{t.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
              aria-label="Close tab"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <button
        onClick={newTab}
        className="flex items-center px-3 text-muted-foreground hover:text-foreground"
        aria-label="New tab"
        title="New request tab"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
