import { useState, useEffect } from 'react';

const STORAGE_KEY = 'petbase_search_history';
const MAX_ENTRIES = 20;

export interface SearchHistoryEntry {
  query: string;
  serviceType: string;
  timestamp: number;
}

function loadHistory(): SearchHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries: SearchHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function addSearchHistory(query: string, serviceType: string) {
  if (!query.trim()) return;
  const entries = loadHistory().filter(e => e.query !== query || e.serviceType !== serviceType);
  entries.unshift({ query, serviceType, timestamp: Date.now() });
  saveHistory(entries);
}

export function clearSearchHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

interface SearchHistoryProps {
  onSelect: (entry: SearchHistoryEntry) => void;
}

export function SearchHistory({ onSelect }: SearchHistoryProps) {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Recent Searches
        </h3>
        <button
          onClick={() => { clearSearchHistory(); setEntries([]); }}
          className="text-xs text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.slice(0, 8).map((entry, i) => (
          <button
            key={`${entry.query}-${i}`}
            onClick={() => onSelect(entry)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">history</span>
            {entry.query}
            <span className="text-xs text-on-surface-variant/40">{entry.serviceType}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
