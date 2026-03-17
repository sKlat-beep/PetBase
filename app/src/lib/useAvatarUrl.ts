import { useState, useEffect } from 'react';
import { getAvatarUrl } from './tokenService';
import { useAvatarCache } from '../contexts/AvatarCacheContext';

/**
 * Resolves a potentially-tokenized avatar URL for the given uid.
 * Returns an empty string while loading or if the URL is empty.
 * Results are cached in-memory for 55 minutes via AvatarCacheContext.
 */
export function useAvatarUrl(uid: string, rawUrl: string): string {
  const { getFromCache, setInCache } = useAvatarCache();
  const [url, setUrl] = useState(() => getFromCache(uid) ?? '');

  useEffect(() => {
    if (!uid || !rawUrl) { setUrl(''); return; }
    const cached = getFromCache(uid);
    if (cached) { setUrl(cached); return; }
    let active = true;
    getAvatarUrl(uid, rawUrl).then(u => {
      if (active) {
        setInCache(uid, u);
        setUrl(u);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [uid, rawUrl, getFromCache, setInCache]);

  return url;
}
