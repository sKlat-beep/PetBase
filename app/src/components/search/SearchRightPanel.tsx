import { useState, useEffect } from 'react';
import type { SearchHistoryEntry } from '../../utils/yelpOrchestrator';

const FAVORITES_KEY = 'petbase_search_favorites';

function loadFavorites(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(entries: SearchHistoryEntry[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(entries));
}

interface SearchRightPanelProps {
  history: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
}

export function SearchRightPanel({ history, onSelect }: SearchRightPanelProps) {
  const [favorites, setFavorites] = useState<SearchHistoryEntry[]>(loadFavorites);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(false);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const isFavorited = (id: string) => favorites.some(f => f.id === id);

  const addFavorite = (entry: SearchHistoryEntry) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === entry.id)) return prev;
      return [entry, ...prev];
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Favorites */}
      <div className="glass-card border border-outline-variant overflow-hidden">
        <button
          type="button"
          onClick={() => setFavoritesOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[18px] text-tertiary">star</span>
            Favorites
          </span>
          <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${favoritesOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {favoritesOpen && (
          <div className="border-t border-outline-variant">
            {favorites.length === 0 ? (
              <p className="px-4 py-3 text-sm text-on-surface-variant">No favorites yet</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {favorites.map(entry => (
                  <li key={entry.id} className="flex items-center gap-2 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-on-surface truncate">{entry.queryPreview}</p>
                      <p className="text-xs text-on-surface-variant truncate">{entry.serviceType} · {entry.zip}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFavorite(entry.id)}
                      className="shrink-0 p-1 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Recent Searches */}
      <div className="glass-card border border-outline-variant overflow-hidden">
        <button
          type="button"
          onClick={() => setRecentOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">history</span>
            Recent Searches
          </span>
          <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${recentOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {recentOpen && (
          <div className="border-t border-outline-variant">
            {history.length === 0 ? (
              <p className="px-4 py-3 text-sm text-on-surface-variant">No recent searches</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {history.map(entry => (
                  <li key={entry.id} className="flex items-center gap-2 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-on-surface truncate">{entry.queryPreview}</p>
                      <p className="text-xs text-on-surface-variant truncate">{entry.serviceType} · {entry.zip}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => addFavorite(entry)}
                      disabled={isFavorited(entry.id)}
                      className="shrink-0 p-1 rounded-md text-on-surface-variant hover:text-tertiary hover:bg-tertiary-container/20 transition-colors disabled:opacity-40"
                      aria-label="Add to favorites"
                    >
                      <span className="material-symbols-outlined text-[16px]">{isFavorited(entry.id) ? 'star' : 'star_border'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
