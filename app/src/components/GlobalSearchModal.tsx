import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { searchPublicProfiles } from '../lib/firestoreService';
import { useCommunity } from '../contexts/CommunityContext';

interface SearchResult {
  id: string;
  type: 'person' | 'group' | 'service';
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  route: string;
}

interface GlobalSearchModalProps {
  onClose: () => void;
}

export function GlobalSearchModal({ onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { groups } = useCommunity();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }

    const timeout = setTimeout(async () => {
      const items: SearchResult[] = [];

      // Search people
      const profiles = await searchPublicProfiles(query);
      profiles.slice(0, 5).forEach(p => {
        items.push({
          id: p.uid,
          type: 'person',
          title: p.displayName,
          subtitle: p.username ? `@${p.username}` : '',
          avatarUrl: p.avatarUrl,
          route: `/messages?uid=${p.uid}`,
        });
      });

      // Search groups
      const queryLower = query.toLowerCase();
      groups
        .filter(g => g.name.toLowerCase().includes(queryLower))
        .slice(0, 5)
        .forEach(g => {
          items.push({
            id: g.id,
            type: 'group',
            title: g.name,
            subtitle: `${Object.keys(g.members).length} members`,
            route: `/community/groups/${g.id}`,
          });
        });

      setResults(items);
      setSelectedIndex(0);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, groups]);

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.route);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  const typeIcon: Record<string, string> = {
    person: 'person',
    group: 'group',
    service: 'store',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Global search"
    >
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search people, groups..."
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/50 outline-none text-sm"
          />
          <kbd className="text-xs text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {results.length > 0 && (
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {results.map((r, i) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${i === selectedIndex ? 'bg-primary-container/20' : 'hover:bg-surface-container'}`}
                >
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="material-symbols-outlined w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant text-[16px]">
                      {typeIcon[r.type]}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-on-surface-variant truncate">{r.subtitle}</p>}
                  </div>
                  <span className="text-xs text-on-surface-variant/50 capitalize">{r.type}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.length >= 2 && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-on-surface-variant">No results found</p>
        )}

        {query.length < 2 && (
          <p className="px-4 py-6 text-center text-sm text-on-surface-variant/50">
            Type at least 2 characters to search
          </p>
        )}
      </div>
    </div>
  );
}
