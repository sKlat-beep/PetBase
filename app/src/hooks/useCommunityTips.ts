/**
 * useCommunityTips — Community tips state extracted from Search.tsx
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Tip = { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number };

export function useCommunityTips() {
  const { user, profile } = useAuth();

  const [localTips, setLocalTips] = useState<Record<string, Tip[]>>(
    () => { try { return JSON.parse(localStorage.getItem('petbase-service-tips') || '{}'); } catch { return {}; } },
  );

  const addLocalTip = (serviceId: string, text: string, rating: number) => {
    const newTip: Tip = {
      text,
      author: profile?.displayName || 'Anonymous',
      date: new Date().toISOString(),
      ...(rating > 0 ? { rating } : {}),
    };
    const updated = { ...localTips, [serviceId]: [newTip, ...(localTips[serviceId] || [])].slice(0, 5) };
    setLocalTips(updated);
    localStorage.setItem('petbase-service-tips', JSON.stringify(updated));
  };

  const upvoteTip = (serviceId: string, tipIdx: number) => {
    const currentUid = user?.uid ?? 'anon';
    const tips = localTips[serviceId] ?? [];
    const tip = tips[tipIdx];
    if (!tip) return;
    const voters = tip.upvoters ?? [];
    if (voters.includes(currentUid)) return;
    const updatedTip = { ...tip, upvotes: (tip.upvotes ?? 0) + 1, upvoters: [...voters, currentUid] };
    const updatedTips = tips.map((t, i) => i === tipIdx ? updatedTip : t);
    updatedTips.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    const updated = { ...localTips, [serviceId]: updatedTips };
    setLocalTips(updated);
    localStorage.setItem('petbase-service-tips', JSON.stringify(updated));
  };

  /** Flat array of the 10 most recent tips across all services, for the SideRail */
  const recentTips = useMemo(() => {
    const all: (Tip & { serviceId: string })[] = [];
    for (const [serviceId, tips] of Object.entries(localTips)) {
      for (const tip of tips) {
        all.push({ ...tip, serviceId });
      }
    }
    return all
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [localTips]);

  return { localTips, addLocalTip, upvoteTip, recentTips };
}
