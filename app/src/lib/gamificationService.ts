/**
 * PetBase Gamification Service
 *
 * Points, levels, badges, and streaks engine.
 * Persists state in Firestore at users/{uid}/gamification (single doc).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type {
  GamificationState,
  Badge,
  PointAction,
  PointEvent,
} from '../types/gamification';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HISTORY_CAP = 50;

/** Points awarded per action */
export const POINT_VALUES: Record<PointAction, number> = {
  'add-pet': 50,
  'upload-photo': 25,
  'complete-profile': 100,
  'create-card': 30,
  'share-card': 20,
  'log-medical': 25,
  'join-group': 15,
  'create-post': 10,
  'send-friend-request': 5,
  'complete-onboarding': 200,
  'vaccine-streak': 10,
  'daily-streak': 5,
  'pet-anniversary': 100,
};

/** Level thresholds (sorted ascending) */
export const LEVELS: { level: number; points: number; label: string }[] = [
  { level: 1, points: 0, label: 'Puppy Parent' },
  { level: 2, points: 100, label: 'Pet Pal' },
  { level: 3, points: 300, label: 'Animal Ally' },
  { level: 4, points: 600, label: 'Critter Champion' },
  { level: 5, points: 1000, label: 'Beast Master' },
  { level: 6, points: 2000, label: 'Pet Whisperer' },
  { level: 7, points: 5000, label: 'Legendary Guardian' },
];

/** Badge definitions */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (ctx: BadgeContext) => boolean;
}

export interface BadgeContext {
  petCount: number;
  photoCount: number;
  medicalCount: number;
  groupCount: number;
  cardCount: number;
  shareCount: number;
  dailyStreak: number;
  vaccineStreakDays: number;
  oldestPetDate: number | null;
  onboardingComplete: boolean;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete onboarding',
    icon: 'footprint',
    check: (ctx) => ctx.onboardingComplete,
  },
  {
    id: 'pet-parent',
    name: 'Pet Parent',
    description: 'Add first pet',
    icon: 'pets',
    check: (ctx) => ctx.petCount >= 1,
  },
  {
    id: 'shutterbug',
    name: 'Shutterbug',
    description: 'Upload 5 photos',
    icon: 'photo_camera',
    check: (ctx) => ctx.photoCount >= 5,
  },
  {
    id: 'health-hero',
    name: 'Health Hero',
    description: 'Log 10 medical records',
    icon: 'health_and_safety',
    check: (ctx) => ctx.medicalCount >= 10,
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Join 3 groups',
    icon: 'diversity_3',
    check: (ctx) => ctx.groupCount >= 3,
  },
  {
    id: 'card-collector',
    name: 'Card Collector',
    description: 'Create 5 cards',
    icon: 'style',
    check: (ctx) => ctx.cardCount >= 5,
  },
  {
    id: 'sharing-caring',
    name: 'Sharing Is Caring',
    description: 'Share 10 cards',
    icon: 'share',
    check: (ctx) => ctx.shareCount >= 10,
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: '30-day daily streak',
    icon: 'local_fire_department',
    check: (ctx) => ctx.dailyStreak >= 30,
  },
  {
    id: 'vaccine-champion',
    name: 'Vaccine Champion',
    description: 'All pets vaccines current 90 days',
    icon: 'verified',
    check: (ctx) => ctx.vaccineStreakDays >= 90,
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    description: '1 year with a pet',
    icon: 'cake',
    check: (ctx) => {
      if (ctx.oldestPetDate === null) return false;
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      return Date.now() - ctx.oldestPetDate >= oneYear;
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

/** Returns a blank gamification state for new users. */
export function defaultGamificationState(): GamificationState {
  return {
    totalPoints: 0,
    level: 1,
    levelLabel: 'Puppy Parent',
    badges: [],
    streaks: [],
    history: [],
    lastDailyCheck: 0,
  };
}

/** Compute the level and label for a given point total. */
export function computeLevel(points: number): { level: number; label: string } {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.points) {
      result = l;
    } else {
      break;
    }
  }
  return { level: result.level, label: result.label };
}

/** Progress toward the next level. */
export function pointsForNextLevel(currentPoints: number): {
  current: number;
  next: number;
  progress: number;
} {
  const { level } = computeLevel(currentPoints);
  const currentThreshold = LEVELS.find((l) => l.level === level)!.points;
  const nextLevel = LEVELS.find((l) => l.level === level + 1);

  if (!nextLevel) {
    // Max level reached
    return { current: currentPoints, next: currentPoints, progress: 1 };
  }

  const range = nextLevel.points - currentThreshold;
  const earned = currentPoints - currentThreshold;
  return {
    current: currentPoints,
    next: nextLevel.points,
    progress: range > 0 ? earned / range : 1,
  };
}

/** Check all badge conditions against the provided context, returning newly earned badges. */
export function checkBadges(
  state: GamificationState,
  context: BadgeContext,
): Badge[] {
  const earnedIds = new Set(state.badges.map((b) => b.id));
  const newBadges: Badge[] = [];

  for (const def of BADGE_DEFINITIONS) {
    if (earnedIds.has(def.id)) continue;
    if (def.check(context)) {
      newBadges.push({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: Date.now(),
      });
    }
  }

  return newBadges;
}

/* ------------------------------------------------------------------ */
/*  Firestore persistence                                              */
/* ------------------------------------------------------------------ */

function gamificationDocRef(uid: string) {
  return doc(db, 'users', uid, 'gamification', 'state');
}

/** Load gamification state from Firestore (or return default). */
export async function loadGamificationState(
  uid: string,
): Promise<GamificationState> {
  const snap = await getDoc(gamificationDocRef(uid));
  if (!snap.exists()) {
    return defaultGamificationState();
  }
  return snap.data() as GamificationState;
}

/** Save gamification state to Firestore. */
export async function saveGamificationState(
  uid: string,
  state: GamificationState,
): Promise<void> {
  await setDoc(gamificationDocRef(uid), state);
}

/* ------------------------------------------------------------------ */
/*  Core actions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Award points for an action. Reads current state from Firestore,
 * adds points, checks for level-up, writes back.
 * Badge checking is NOT done here — call checkBadges separately with
 * the appropriate BadgeContext.
 */
export async function awardPoints(
  uid: string,
  action: PointAction,
  petId?: string,
): Promise<{ pointsAwarded: number; newBadges: Badge[] }> {
  const state = await loadGamificationState(uid);

  const points = POINT_VALUES[action];
  state.totalPoints += points;

  // Recompute level
  const { level, label } = computeLevel(state.totalPoints);
  state.level = level;
  state.levelLabel = label;

  // Append history event (FIFO, capped)
  const event: PointEvent = {
    action,
    points,
    timestamp: Date.now(),
    ...(petId ? { petId } : {}),
  };
  state.history = [event, ...state.history].slice(0, HISTORY_CAP);

  await saveGamificationState(uid, state);

  // newBadges is empty here — caller should use checkBadges with full context
  return { pointsAwarded: points, newBadges: [] };
}

/**
 * Check and update the daily streak. Awards daily-streak points if the
 * user hasn't checked in today yet. Returns the new streak count.
 */
export async function checkDailyStreak(uid: string): Promise<number> {
  const state = await loadGamificationState(uid);

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  // Already checked in today
  if (state.lastDailyCheck >= todayMs) {
    const dailyStreak = state.streaks.find((s) => s.id === 'daily');
    return dailyStreak?.currentCount ?? 0;
  }

  // Check if last check was yesterday (continuation) or earlier (reset)
  const yesterdayStart = todayMs - 24 * 60 * 60 * 1000;
  let dailyStreak = state.streaks.find((s) => s.id === 'daily');

  if (!dailyStreak) {
    dailyStreak = {
      id: 'daily',
      name: 'Daily Check-in',
      currentCount: 0,
      bestCount: 0,
      lastUpdated: now,
    };
    state.streaks.push(dailyStreak);
  }

  if (state.lastDailyCheck >= yesterdayStart) {
    // Continued streak
    dailyStreak.currentCount += 1;
  } else {
    // Streak broken — reset
    dailyStreak.currentCount = 1;
  }

  dailyStreak.bestCount = Math.max(dailyStreak.bestCount, dailyStreak.currentCount);
  dailyStreak.lastUpdated = now;
  state.lastDailyCheck = now;

  // Award daily-streak points
  const points = POINT_VALUES['daily-streak'];
  state.totalPoints += points;
  const { level, label } = computeLevel(state.totalPoints);
  state.level = level;
  state.levelLabel = label;

  const event: PointEvent = {
    action: 'daily-streak',
    points,
    timestamp: now,
  };
  state.history = [event, ...state.history].slice(0, HISTORY_CAP);

  await saveGamificationState(uid, state);
  return dailyStreak.currentCount;
}
