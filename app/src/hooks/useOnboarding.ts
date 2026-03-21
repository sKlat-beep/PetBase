import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  readLocalOnboardingState,
  loadAndMergeFromFirestore,
  markStepCompleted as svcMarkStep,
  markStepSkipped as svcMarkSkip,
  markGuideCompleted as svcMarkGuide,
  dismissHint as svcDismiss,
  completeHint as svcComplete,
  awardMilestoneBadge,
  computeLevel,
  migrateOldLocalStorageKeys,
  migrateStepIds,
  LEVEL_LABELS,
  MILESTONES,
} from '../lib/onboardingService';
import type { OnboardingState, PetParentLevel } from '../types/onboarding';
import type { FeatureHint, HintCategory } from '../types/onboarding';
import { HINTS, HINT_CATEGORIES, TOTAL_FEATURES } from '../data/featureHints';
import { STEPS } from '../data/onboardingSteps';

export interface UseOnboardingReturn {
  // State
  state: OnboardingState;
  loading: boolean;

  // Computed
  completedCount: number;  // completed steps only — drives progress bar
  doneCount: number;       // completed + skipped — drives guide dismissal
  totalSteps: number;
  guideCompleted: boolean;
  discoveryCount: number;
  petParentLevel: PetParentLevel;
  petParentLevelLabel: string;
  milestoneBadges: string[];
  totalFeatures: number;

  // Actions
  markStepCompleted: (stepId: string) => void;
  markStepSkipped: (stepId: string) => void;
  markGuideCompleted: () => void;
  dismissHint: (hintId: string) => void;
  completeHint: (hintId: string) => void;

  // Helpers
  isStepDone: (stepId: string) => boolean;
  isStepCompleted: (stepId: string) => boolean;
  isStepSkipped: (stepId: string) => boolean;

  // Hint helpers
  availableHints: FeatureHint[];
  currentHint: FeatureHint | null;
  randomHint: () => FeatureHint | null;

  // Milestone detection — returns newly crossed milestone badge or null
  checkMilestones: (celebrate: (id: string) => void) => void;

  // Micro-copy
  milestoneCopy: string;
}

/** Get milestone micro-copy based on completed count (out of 10 basic steps). */
function getMilestoneCopy(count: number, total: number): string {
  if (count >= total) return 'All done! Great work.';
  if (count >= total - 1) return 'One more step!';
  if (count >= total - 2) return 'Almost done — just a couple more!';
  if (count >= Math.ceil(total * 0.7)) return 'Almost done — just a couple more!';
  if (count >= Math.ceil(total * 0.5)) return 'Halfway there!';
  if (count >= Math.ceil(total * 0.3)) return 'Nice — your PetBase is taking shape!';
  if (count >= 1) return "You're off to a great start!";
  return 'Set up your PetBase in a few steps.';
}

/**
 * Filter and rotate hints by category (round-robin) so users see variety.
 * Only includes hints where: not dismissed, prerequisite met.
 */
function getAvailableHints(
  state: OnboardingState,
): FeatureHint[] {
  const completedStepIds = new Set(Object.keys(state.completedSteps));
  const dismissedSet = new Set(state.dismissedHints);

  // Filter to eligible hints
  const eligible = HINTS.filter((h) => {
    if (dismissedSet.has(h.id)) return false;
    if (h.prerequisite && !completedStepIds.has(h.prerequisite)) return false;
    return true;
  });

  // Round-robin by category
  const byCat = new Map<HintCategory, FeatureHint[]>();
  for (const h of eligible) {
    const arr = byCat.get(h.category) || [];
    arr.push(h);
    byCat.set(h.category, arr);
  }

  const result: FeatureHint[] = [];
  const cats = HINT_CATEGORIES.filter((c) => byCat.has(c));
  if (cats.length === 0) return result;

  // Interleave: take one from each category in order, repeat
  let added = true;
  let round = 0;
  while (added) {
    added = false;
    for (const cat of cats) {
      const arr = byCat.get(cat)!;
      if (round < arr.length) {
        result.push(arr[round]);
        added = true;
      }
    }
    round++;
  }

  return result;
}

export function useOnboarding(uid: string | null): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingState>(() => {
    migrateOldLocalStorageKeys();
    migrateStepIds();
    return readLocalOnboardingState();
  });
  const [loading, setLoading] = useState(true);

  // Sync from Firestore on auth
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadAndMergeFromFirestore(uid).then((merged) => {
      if (!cancelled) {
        setState(merged);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [uid]);

  // Listen for cross-component updates
  useEffect(() => {
    const refresh = () => setState(readLocalOnboardingState());
    window.addEventListener('petbase-guide-update', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('petbase-guide-update', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Only truly completed steps (drives progress bar)
  const completedCount = useMemo(() => {
    const completedStepIds = new Set(Object.keys(state.completedSteps));
    return STEPS.filter((s) => completedStepIds.has(s.id)).length;
  }, [state.completedSteps]);

  // Completed + skipped (drives guide dismissal when all are handled)
  const doneCount = useMemo(() => {
    const completedStepIds = new Set(Object.keys(state.completedSteps));
    const skippedSet = new Set(state.skippedSteps);
    return STEPS.filter((s) => completedStepIds.has(s.id) || skippedSet.has(s.id)).length;
  }, [state.completedSteps, state.skippedSteps]);

  const isStepCompleted = useCallback(
    (stepId: string) => !!state.completedSteps[stepId],
    [state.completedSteps],
  );

  const isStepSkipped = useCallback(
    (stepId: string) => state.skippedSteps.includes(stepId),
    [state.skippedSteps],
  );

  const isStepDone = useCallback(
    (stepId: string) => isStepCompleted(stepId) || isStepSkipped(stepId),
    [isStepCompleted, isStepSkipped],
  );

  const availableHints = useMemo(() => getAvailableHints(state), [state]);

  const currentHint = availableHints.length > 0 ? availableHints[0] : null;

  const randomHint = useCallback((): FeatureHint | null => {
    if (availableHints.length === 0) return null;
    return availableHints[Math.floor(Math.random() * availableHints.length)];
  }, [availableHints]);

  const checkMilestones = useCallback(
    (celebrate: (id: string) => void) => {
      for (const m of MILESTONES) {
        if (state.discoveryCount >= m.count && !state.milestoneBadges.includes(m.badge)) {
          awardMilestoneBadge(m.badge);
          celebrate(`milestone-${m.badge}`);
        }
      }
    },
    [state.discoveryCount, state.milestoneBadges],
  );

  const petParentLevel = computeLevel(state.discoveryCount);
  const milestoneCopy = getMilestoneCopy(completedCount, STEPS.length);

  return {
    state,
    loading,
    completedCount,
    doneCount,
    totalSteps: STEPS.length,
    guideCompleted: state.guideCompleted,
    discoveryCount: state.discoveryCount,
    petParentLevel,
    petParentLevelLabel: LEVEL_LABELS[petParentLevel],
    milestoneBadges: state.milestoneBadges,
    totalFeatures: TOTAL_FEATURES,

    markStepCompleted: svcMarkStep,
    markStepSkipped: svcMarkSkip,
    markGuideCompleted: svcMarkGuide,
    dismissHint: svcDismiss,
    completeHint: svcComplete,

    isStepDone,
    isStepCompleted,
    isStepSkipped,

    availableHints,
    currentHint,
    randomHint,
    checkMilestones,
    milestoneCopy,
  };
}
