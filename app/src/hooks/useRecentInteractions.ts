/**
 * useRecentInteractions — Interaction tracking & favorites extracted from Search.tsx
 */

import { useState } from 'react';

export interface RecentInteraction {
  id: string;
  type: 'store' | 'website';
  name: string;
  timestamp: number;
  image?: string;
}

export function useRecentInteractions() {
  const [favoriteWebsites, setFavoriteWebsites] = useState<string[]>(
    JSON.parse(localStorage.getItem('petbase_fav_websites') || '[]'),
  );
  const [recent, setRecent] = useState<RecentInteraction[]>(
    JSON.parse(localStorage.getItem('petbase_recent_interactions') || '[]'),
  );

  const toggleFavoriteWebsite = (id: string) => {
    const updated = favoriteWebsites.includes(id)
      ? favoriteWebsites.filter(fav => fav !== id)
      : [...favoriteWebsites, id];
    setFavoriteWebsites(updated);
    localStorage.setItem('petbase_fav_websites', JSON.stringify(updated));
  };

  const recordInteraction = (id: string, type: 'store' | 'website', name: string, image?: string) => {
    const interaction: RecentInteraction = { id, type, name, timestamp: Date.now(), image };
    const filtered = recent.filter(i => i.id !== id);
    const updated = [interaction, ...filtered].slice(0, 10);
    setRecent(updated);
    localStorage.setItem('petbase_recent_interactions', JSON.stringify(updated));
  };

  return { favoriteWebsites, toggleFavoriteWebsite, recent, recordInteraction };
}
