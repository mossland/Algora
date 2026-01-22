'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Search, X, User, FileText, AlertCircle, Radio, MessageSquare, Loader2 } from 'lucide-react';
// Link import removed - using router.push instead
import { usePathname, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3201';

interface SearchResult {
  id: string;
  type: 'agent' | 'proposal' | 'issue' | 'signal' | 'session';
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  url: string;
}

interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
}

const typeIcons = {
  agent: User,
  proposal: FileText,
  issue: AlertCircle,
  signal: Radio,
  session: MessageSquare,
};

const typeColors = {
  agent: 'text-purple-500',
  proposal: 'text-blue-500',
  issue: 'text-orange-500',
  signal: 'text-green-500',
  session: 'text-pink-500',
};

const typeLabels = {
  agent: 'Agent',
  proposal: 'Proposal',
  issue: 'Issue',
  signal: 'Signal',
  session: 'Session',
};

export function GlobalSearch() {
  const t = useTranslations('Search');
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'en';

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search query
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleResultClick = useCallback((url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/${locale}${url}`);
  }, [router, locale]);

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 rounded-lg border border-agora-border dark:border-agora-dark-border bg-agora-darker dark:bg-agora-dark-card px-3 py-1.5 text-sm text-agora-muted hover:bg-agora-card dark:hover:bg-agora-dark-border transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">{t('placeholder') || 'Search...'}</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-agora-border dark:border-agora-dark-border bg-agora-dark dark:bg-agora-dark-darker px-1.5 text-[10px] font-medium text-agora-muted">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[10vh]">
          <div className="w-full max-w-xl mx-4 rounded-xl border border-agora-border dark:border-agora-dark-border bg-agora-dark dark:bg-agora-dark-card shadow-2xl">
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-agora-border dark:border-agora-dark-border p-4">
              <Search className="h-5 w-5 text-agora-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('placeholder') || 'Search agents, proposals, issues...'}
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-agora-muted outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded hover:bg-agora-border dark:hover:bg-agora-dark-border"
                >
                  <X className="h-4 w-4 text-agora-muted" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className="text-xs text-agora-muted hover:text-slate-900 dark:hover:text-white"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8 text-agora-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}

              {!isLoading && query.length >= 2 && data?.results?.length === 0 && (
                <div className="py-8 text-center text-agora-muted">
                  <p>{t('noResults') || 'No results found'}</p>
                  <p className="text-sm mt-1">{t('tryDifferent') || 'Try a different search term'}</p>
                </div>
              )}

              {!isLoading && data?.results && data.results.length > 0 && (
                <div className="space-y-1">
                  {data.results.map((result) => {
                    const Icon = typeIcons[result.type];
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result.url)}
                        className="w-full flex items-start gap-3 rounded-lg p-3 text-left hover:bg-agora-darker dark:hover:bg-agora-dark-border transition-colors"
                      >
                        <div className={`flex-shrink-0 ${typeColors[result.type]}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-white truncate">
                              {result.title}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[result.type]} bg-current/10`}>
                              {typeLabels[result.type]}
                            </span>
                          </div>
                          {result.description && (
                            <p className="text-sm text-agora-muted truncate mt-0.5">
                              {result.description}
                            </p>
                          )}
                          {result.status && (
                            <span className="text-xs text-agora-muted mt-1 inline-block">
                              {result.status}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {query.length < 2 && (
                <div className="py-8 text-center text-agora-muted">
                  <p>{t('typeToSearch') || 'Type at least 2 characters to search'}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-500">Agents</span>
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500">Proposals</span>
                    <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-500">Issues</span>
                    <span className="px-2 py-1 rounded bg-green-500/10 text-green-500">Signals</span>
                    <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-500">Sessions</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-agora-border dark:border-agora-dark-border px-4 py-2 text-xs text-agora-muted">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-agora-darker dark:bg-agora-dark-darker border border-agora-border dark:border-agora-dark-border">↵</kbd>
                  {t('toSelect') || 'to select'}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-agora-darker dark:bg-agora-dark-darker border border-agora-border dark:border-agora-dark-border">esc</kbd>
                  {t('toClose') || 'to close'}
                </span>
              </div>
              <span>{data?.count || 0} {t('results') || 'results'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
