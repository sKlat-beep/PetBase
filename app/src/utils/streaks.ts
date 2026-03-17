import { get, set } from 'idb-keyval';

const STREAK_KEY = (uid: string) => `petbase-streak-${uid}`;

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string; // YYYY-MM-DD
  activeDates: string[]; // recent 90 days of activity dates
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function getStreakData(uid: string): Promise<StreakData> {
  const data = await get<StreakData>(STREAK_KEY(uid));
  if (!data) return { currentStreak: 0, longestStreak: 0, lastLogDate: '', activeDates: [] };

  // Reset streak if last log was before yesterday
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (data.lastLogDate !== today && data.lastLogDate !== yesterday) {
    return { ...data, currentStreak: 0 };
  }
  return data;
}

export async function recordHealthActivity(uid: string): Promise<StreakData> {
  const today = todayStr();
  const existing = await getStreakData(uid);

  // Already logged today
  if (existing.lastLogDate === today) return existing;

  const isConsecutive = existing.lastLogDate === yesterdayStr();
  const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
  const longestStreak = Math.max(existing.longestStreak, newStreak);

  // Keep only last 90 dates
  const activeDates = [today, ...existing.activeDates.filter(d => d !== today)].slice(0, 90);

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak,
    lastLogDate: today,
    activeDates,
  };

  await set(STREAK_KEY(uid), updated);
  return updated;
}
