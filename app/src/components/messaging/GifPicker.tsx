import { useState, useEffect, useRef, useCallback } from 'react';

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
      <div className="bg-surface-container rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <h2 className="text-sm font-semibold text-on-surface">Search GIFs</h2>
          <button
            onClick={onClose}
            aria-label="Close GIF picker"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* No API key notice */}
        {!TENOR_KEY ? (
          <div className="p-6 text-center text-xs text-on-surface-variant">
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
                className="w-full px-3 py-2 rounded-xl border border-outline-variant
                  bg-surface-container-low text-on-surface
                  placeholder:text-on-surface-variant text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Results grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 max-h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined text-[24px] animate-spin text-on-surface-variant">progress_activity</span>
                </div>
              ) : error ? (
                <p className="text-center text-xs text-error py-8">{error}</p>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-on-surface-variant py-8">
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
                        className="rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-primary outline-none hover:opacity-80 transition-opacity"
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
              <span className="text-xs text-on-surface-variant tracking-wide">
                Powered by Tenor
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
