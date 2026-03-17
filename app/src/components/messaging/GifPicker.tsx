import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';

interface TenorResult {
  id: string;
  title: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
    nanogif?: { url: string };
  };
}

interface TenorResponse {
  results: TenorResult[];
  next?: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string, previewUrl: string) => void;
  onClose: () => void;
}

const TENOR_KEY = import.meta.env.VITE_TENOR_KEY as string | undefined;
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const LIMIT = 20;

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TenorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fetchGifs = useCallback(async (q: string) => {
    if (!TENOR_KEY) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const endpoint = q.trim()
      ? `${TENOR_BASE}/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=${LIMIT}&media_filter=gif`
      : `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=${LIMIT}&media_filter=gif`;

    try {
      const res = await fetch(endpoint, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Tenor API error: ${res.status}`);
      const data: TenorResponse = await res.json() as TenorResponse;
      setResults(data.results ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Failed to load GIFs');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trending on mount
  useEffect(() => {
    if (TENOR_KEY) void fetchGifs('');
  }, [fetchGifs]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchGifs(val), 300);
  };

  const handleSelect = (item: TenorResult) => {
    const full = item.media_formats.gif.url;
    const preview =
      item.media_formats.tinygif?.url ??
      item.media_formats.nanogif?.url ??
      full;
    onSelect(full, preview);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 shrink-0">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Search GIFs</h2>
          <button
            onClick={onClose}
            aria-label="Close GIF picker"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* No API key notice */}
        {!TENOR_KEY ? (
          <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
            GIF support requires a Tenor API key (<code>VITE_TENOR_KEY</code>).
          </div>
        ) : (
          <>
            {/* Search input */}
            <div className="px-4 py-3 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search GIFs…"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600
                  bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100
                  placeholder:text-stone-400 text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Results grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 max-h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
              ) : error ? (
                <p className="text-center text-xs text-red-500 py-8">{error}</p>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-stone-500 dark:text-stone-400 py-8">
                  {query ? 'No GIFs found' : 'Start typing to search'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {results.map((item) => {
                    const preview =
                      item.media_formats.tinygif?.url ??
                      item.media_formats.nanogif?.url ??
                      item.media_formats.gif.url;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-sky-500 outline-none hover:opacity-80 transition-opacity"
                        aria-label={item.title || 'GIF'}
                      >
                        <img
                          src={preview}
                          alt={item.title || 'GIF'}
                          className="w-full h-24 object-cover"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tenor attribution — required by Tenor API terms */}
            <div className="px-4 py-2 shrink-0 flex justify-end">
              <span className="text-[10px] text-stone-400 dark:text-stone-500 tracking-wide">
                Powered by Tenor
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
