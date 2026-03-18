/**
 * Onboarding state persistence: localStorage (fast cache) + Firestore (durable).
 *
 * Write path: localStorage immediately → fire-and-forget Firestore merge write.
 * Read path: localStorage for instant render → Firestore load + union merge on auth.
 */

import { saveOnboardingState as firestoreSave, loadOnboardingState as firestoreLoad } from './firestoreService';
import type { OnboardingState, PetParentLevel } from '../types/onboarding';
import { TOTAL_FEATURES } from '../data/featureHints';

// ─── Module-level UID (set from AuthContext on login) ────────────────────────

let _uid: string | null = null;

export function setOnboardingUid(uid: string | null) {
  _uid = uid;
}

// ─── localStorage keys ──────────────────────────────────────────────────────

const LS_KEY = 'petbase-onboarding-state';

// Legacy keys for migration
const LEGACY_STEP_PREFIX = 'petbase-step-';
const LEGACY_COMPLETE_KEY = 'petbase-guide-completed';
const LEGACY_SKIPPED_KEY = 'petbase-guide-skipped';
const LEGACY_DISMISSED_KEY = 'petbase-dismissed-recommendations';
const LEGACY_EXPANDED_KEY = 'petbase-guide-expanded';

// ─── Default state ──────────────────────────────────────────────────────────

function defaultState(): OnboardingState {
  return {
    completedSteps: {},
    skippedSteps: [],
    guideCompleted: false,
    tourCompleted: false,
    dismissedHints: [],
    completedHints: [],
    discoveryCount: 0,
    milestoneBadges: [],
    petParentLevel: 'curious-kitten',
    savedAt: 0,
    version: 1,
  };
}

// ─── localStorage read/write ────────────────────────────────────────────────

export function readLocalOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    }
  } catch { /* fall through */ }
  return defaultState();
}

export function writeLocalOnboardingState(state: OnboardingState): void {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ─── Merge algorithm (union) ────────────────────────────────────────────────

export function mergeOnboardingState(
  local: OnboardingState,
  remote: OnboardingState,
): OnboardingState {
  // Union completedSteps: prefer the earlier timestamp for each step
  const completedSteps: Record<string, number> = { ...remote.completedSteps };
  for (const [k, v] of Object.entries(local.completedSteps)) {
    if (!completedSteps[k] || v < completedSteps[k]) {
      completedSteps[k] = v;
    }
  }

  // Union arrays (deduplicated)
  const skippedSteps = [...new Set([...local.skippedSteps, ...remote.skippedSteps])];
  const dismissedHints = [...new Set([...local.dismissedHints, ...remote.dismissedHints])];
  const completedHints = [...new Set([...local.completedHints, ...remote.completedHints])];
  const milestoneBadges = [...new Set([...local.milestoneBadges, ...remote.milestoneBadges])];

  // Prefer true from either source
  const guideCompleted = local.guideCompleted || remote.guideCompleted;
  const guideCompletedAt = local.guideCompletedAt ?? remote.guideCompletedAt;
  const tourCompleted = local.tourCompleted || remote.tourCompleted;

  // Recompute discovery count from merged data
  const discoveryCount = Object.keys(completedSteps).length + completedHints.length;
  const petParentLevel = computeLevel(discoveryCount);

  return {
    completedSteps,
    skippedSteps,
    guideCompleted,
    guideCompletedAt,
    tourCompleted,
    dismissedHints,
    completedHints,
    discoveryCount,
    milestoneBadges,
    petParentLevel,
    savedAt: Math.max(local.savedAt, remote.savedAt),
    version: 1,
  };
}

// ─── Pet Parent Level computation ───────────────────────────────────────────

export function computeLevel(discoveryCount: number): PetParentLevel {
  const pct = discoveryCount / TOTAL_FEATURES;
  if (pct >= 0.76) return 'pet-pro';
  if (pct >= 0.51) return 'seasoned-companion';
  if (pct >= 0.26) return 'savvy-sitter';
  return 'curious-kitten';
}

export const LEVEL_LABELS: Record<PetParentLevel, string> = {
  'curious-kitten': 'Curious Kitten',
  'savvy-sitter': 'Savvy Sitter',
  'seasoned-companion': 'Seasoned Companion',
  'pet-pro': 'Pet Pro',
};

// ─── Milestone thresholds ───────────────────────────────────────────────────

export const MILESTONES = [
  { count: 12, badge: 'explorer', label: 'Explorer' },
  { count: 24, badge: 'adventurer', label: 'Adventurer' },
  { count: 36, badge: 'trailblazer', label: 'Trailblazer' },
  { count: 48, badge: 'petbase-master', label: 'PetBase Master' },
] as const;

// ─── Public API ─────────────────────────────────────────────────────────────

/** Write a partial update to both localStorage and Firestore. */
export function saveOnboardingPatch(patch: Partial<OnboardingState>): void {
  const current = readLocalOnboardingState();
  const updated = { ...current, ...patch, savedAt: Date.now() };
  writeLocalOnboardingState(updated);
  window.dispatchEvent(new Event('petbase-guide-update'));

  // Fire-and-forget Firestore write
  if (_uid) {
    firestoreSave(_uid, patch as Record<string, unknown>).catch(() => {});
  }
}

/** Mark a basic step as completed. */
export function markStepCompleted(stepId: string): void {
  const current = readLocalOnboardingState();
  if (current.completedSteps[stepId]) return; // already done

  const completedSteps = { ...current.completedSteps, [stepId]: Date.now() };
  const discoveryCount = Object.keys(completedSteps).length + current.completedHints.length;
  const petParentLevel = computeLevel(discoveryCount);

  saveOnboardingPatch({ completedSteps, discoveryCount, petParentLevel });
}

/** Mark a basic step as skipped. */
export function markStepSkipped(stepId: string): void {
  const current = readLocalOnboardingState();
  if (current.skippedSteps.includes(stepId)) return;

  const skippedSteps = [...current.skippedSteps, stepId];
  saveOnboardingPatch({ skippedSteps });
}

/** Mark the Getting Started guide as completed. */
export function markGuideCompleted(): void {
  saveOnboardingPatch({
    guideCompleted: true,
    guideCompletedAt: Date.now(),
  });
}

/** Dismiss a feature hint. */
export function dismissHint(hintId: string): void {
  const current = readLocalOnboardingState();
  if (current.dismissedHints.includes(hintId)) return;

  const dismissedHints = [...current.dismissedHints, hintId];
  saveOnboardingPatch({ dismissedHints });
}

/** Mark a feature hint as completed (user did the action). */
export function completeHint(hintId: string): void {
  const current = readLocalOnboardingState();
  if (current.completedHints.includes(hintId)) return;

  const completedHints = [...current.completedHints, hintId];
  const discoveryCount = Object.keys(current.completedSteps).length + completedHints.length;
  const petParentLevel = computeLevel(discoveryCount);

  saveOnboardingPatch({ completedHints, discoveryCount, petParentLevel });
}

/** Award a milestone badge. */
export function awardMilestoneBadge(badgeId: string): void {
  const current = readLocalOnboardingState();
  if (current.milestoneBadges.includes(badgeId)) return;

  const milestoneBadges = [...current.milestoneBadges, badgeId];
  saveOnboardingPatch({ milestoneBadges });
}

// ─── Initial load + merge (called from useOnboarding on auth) ───────────────

export async function loadAndMergeFromFirestore(uid: string): Promise<OnboardingState> {
  const local = readLocalOnboardingState();

  let remote: OnboardingState;
  try {
    const raw = await firestoreLoad(uid);
    remote = raw ? { ...defaultState(), ...(raw as Partial<OnboardingState>) } : defaultState();
  } catch {
    return local; // offline — use local only
  }

  const merged = mergeOnboardingState(local, remote);
  writeLocalOnboardingState(merged);

  // Write merged state back to Firestore if it differs
  if (merged.savedAt !== remote.savedAt || merged.discoveryCount !== remote.discoveryCount) {
    firestoreSave(uid, merged as unknown as Record<string, unknown>).catch(() => {});
  }

  window.dispatchEvent(new Event('petbase-guide-update'));
  return merged;
}

// ─── One-time migration from legacy localStorage keys ───────────────────────

export function migrateOldLocalStorageKeys(): void {
  const alreadyMigrated = localStorage.getItem(LS_KEY);
  if (alreadyMigrated) return; // Already on new format

  const state = defaultState();

  // Migrate completed steps
  const legacyStepIds = [
    'add-pet', 'create-card', 'join-community', 'find-services',
    'create-family', 'enable-notifications', 'privacy-settings',
  ];
  for (const id of legacyStepIds) {
    if (localStorage.getItem(LEGACY_STEP_PREFIX + id) === 'true') {
      state.completedSteps[id] = Date.now();
    }
  }

  // Migrate skipped steps
  try {
    const raw = localStorage.getItem(LEGACY_SKIPPED_KEY);
    if (raw) state.skippedSteps = JSON.parse(raw);
  } catch { /* ignore */ }

  // Migrate guide completed
  if (localStorage.getItem(LEGACY_COMPLETE_KEY) === 'true') {
    state.guideCompleted = true;
    state.guideCompletedAt = Date.now();
  }

  // Migrate dismissed recommendations
  try {
    const raw = localStorage.getItem(LEGACY_DISMISSED_KEY);
    if (raw) state.dismissedHints = JSON.parse(raw);
  } catch { /* ignore */ }

  // Compute discovery count
  state.discoveryCount = Object.keys(state.completedSteps).length + state.completedHints.length;
  state.petParentLevel = computeLevel(state.discoveryCount);
  state.savedAt = Date.now();

  // Only write if we found any legacy data
  const hasLegacyData = Object.keys(state.completedSteps).length > 0
    || state.skippedSteps.length > 0
    || state.guideCompleted
    || state.dismissedHints.length > 0;

  if (hasLegacyData) {
    writeLocalOnboardingState(state);

    // Clean up legacy keys
    for (const id of legacyStepIds) {
      localStorage.removeItem(LEGACY_STEP_PREFIX + id);
    }
    localStorage.removeItem(LEGACY_COMPLETE_KEY);
    localStorage.removeItem(LEGACY_SKIPPED_KEY);
    localStorage.removeItem(LEGACY_DISMISSED_KEY);
    localStorage.removeItem(LEGACY_EXPANDED_KEY);
  }
}

// ─── Compatibility shims for existing mark*() callers ───────────────────────
// These replace the old exports from GettingStartedGuide.tsx

export function markCardCreated() { markStepCompleted('create-card'); }
export function markServicesFound() { markStepCompleted('find-services'); }
export function markFamilyCreated() { markStepCompleted('create-family'); }
export function markNotificationsEnabled() { markStepCompleted('enable-notifications'); }
export function markPrivacyConfigured() { markStepCompleted('privacy-settings'); }
export function markCommunityJoined() { markStepCompleted('join-community'); }
export function markPetPhotoAdded() { markStepCompleted('add-pet-photo'); }
export function markMedicalRecordAdded() { markStepCompleted('add-medical-record'); }
export function markProfileCompleted() { markStepCompleted('complete-profile'); }
