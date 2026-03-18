import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useSocial } from '../../contexts/SocialContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { useAuth } from '../../contexts/AuthContext';
import { isOnline } from '../../utils/presence';
import type { UserProfile } from '../../types/user';

interface SearchResult {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen?: number;
  isFriend: boolean;
}

export function NewConversationSearch() {
  const { searchUsers, directory } = useSocial();
  const { setActiveUid } = useMessaging();
  const { profile } = useAuth() as { profile: (UserProfile & { friends?: string[] }) | null };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // directory is PublicProfile[] — convert to lookup map
  const directoryMap = useRef<Record<string, any>>({});
  useEffect(() => {
    const m: Record<string, any> = {};
    directory.forEach(u => { m[u.uid] = u; });
    directoryMap.current = m;
  }, [directory]);

  const friends = profile?.friends ?? [];

  const buildResults = useCallback((users: any[]): SearchResult[] => {
    return users.slice(0, 8).map((u: any) => ({
      uid: u.uid ?? u.id,
      displayName: u.displayName ?? u.name ?? 'Unknown',
      avatarUrl: u.avatarUrl,
      lastSeen: (u as any).lastSeen,
      isFriend: friends.includes(u.uid ?? u.id),
    }));
  }, [friends]);

  // Empty query: show top 5 friends from directory
  useEffect(() => {
    if (query.trim()) return;
    const friendUsers = directory.filter(u => friends.includes(u.uid)).slice(0, 5);
    setResults(buildResults(friendUsers));
  }, [query, directory, friends, buildResults]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const users = await searchUsers(q);
        setResults(buildResults(users ?? []));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [searchUsers, buildResults]);

  const handleSelect = (uid: string) => {
    setActiveUid(uid);
    setQuery('');
    setHighlightIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); handleSelect(results[highlightIndex].uid); }
    else if (e.key === 'Escape') { setQuery(''); setHighlightIndex(-1); }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); handleSearch(e.target.value); setHighlightIndex(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Search people…"
          className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        {query && (
          <button onClick={() => { setQuery(''); setHighlightIndex(-1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {loading && !results.length && (
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 px-1">Searching…</p>
      )}
      {results.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {results.map((r, i) => (
            <button
              key={r.uid}
              onClick={() => handleSelect(r.uid)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${i === highlightIndex ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}`}
            >
              <div className="relative shrink-0">
                {r.avatarUrl ? (
                  <img src={r.avatarUrl} alt={r.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {r.displayName[0]?.toUpperCase()}
                  </div>
                )}
                {isOnline(r.lastSeen) && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-neutral-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{r.displayName}</p>
              </div>
              {r.isFriend && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full shrink-0">Friend</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
