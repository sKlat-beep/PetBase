import { useState, useEffect, useCallback } from 'react';
import type { GamificationState, PointAction } from '../types/gamification';
import type { BadgeContext } from '../lib/gamificationService';
import {
  loadGamificationState,
  awardPoints as awardPointsSvc,
  checkBadges as checkBadgesSvc,
  checkDailyStreak as checkDailyStreakSvc,
  defaultGamificationState,
} from '../lib/gamificationService';

export function useGamification(uid: string | null) {
  const [state, setState] = useState<GamificationState>(defaultGamificationState());
  const [loading, setLoading] = useState(true);

  const refreshState = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const s = await loadGamificationState(uid);
      setState(s);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setState(defaultGamificationState());
      setLoading(false);
      return;
    }
    refreshState();
  }, [uid, refreshState]);

  const awardPoints = useCallback(
    async (action: PointAction, petId?: string) => {
      if (!uid) return { pointsAwarded: 0, newBadges: [] as never[] };
      const result = await awardPointsSvc(uid, action, petId);

      // Reload state so local copy is fresh
      const updated = await loadGamificationState(uid);
      setState(updated);

      // Emit custom event for PointToast / other listeners
      window.dispatchEvent(
        new CustomEvent('petbase-points-awarded', {
          detail: {
            points: result.pointsAwarded,
            action,
            newBadges: result.newBadges,
          },
        }),
      );

      return result;
    },
    [uid],
  );

  const checkBadges = useCallback(
    (context: BadgeContext) => {
      return checkBadgesSvc(state, context);
    },
    [state],
  );

  const checkDailyStreak = useCallback(async () => {
    if (!uid) return 0;
    const count = await checkDailyStreakSvc(uid);
    const updated = await loadGamificationState(uid);
    setState(updated);
    return count;
  }, [uid]);

  return { state, loading, awardPoints, checkBadges, checkDailyStreak, refreshState };
}
