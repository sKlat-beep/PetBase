import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

interface AvatarCacheContextValue {
  getFromCache: (uid: string) => string | null;
  setInCache: (uid: string, url: string) => void;
}

const AvatarCacheContext = createContext<AvatarCacheContextValue | null>(null);

const TTL_MS = 55 * 60 * 1000; // 55 minutes

export function AvatarCacheProvider({ children }: { children: ReactNode }) {
  const cache = useRef<Map<string, CacheEntry>>(new Map());

  const getFromCache = useCallback((uid: string): string | null => {
    const entry = cache.current.get(uid);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.current.delete(uid);
      return null;
    }
    return entry.url;
  }, []);

  const setInCache = useCallback((uid: string, url: string): void => {
    cache.current.set(uid, { url, expiresAt: Date.now() + TTL_MS });
  }, []);

  return (
    <AvatarCacheContext.Provider value={{ getFromCache, setInCache }}>
      {children}
    </AvatarCacheContext.Provider>
  );
}

export function useAvatarCache() {
  const ctx = useContext(AvatarCacheContext);
  if (!ctx) throw new Error('useAvatarCache must be used within AvatarCacheProvider');
  return ctx;
}
