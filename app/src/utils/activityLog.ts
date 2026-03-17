import { get, set } from 'idb-keyval';

export interface ActivityEntry {
  id: string;
  action: string;
  timestamp: number;
}

const STORAGE_KEY = (uid: string) => `petbase-activity-${uid}`;
const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export async function logActivity(uid: string, action: string): Promise<void> {
  if (!uid) return;
  try {
    const log: ActivityEntry[] = (await get<ActivityEntry[]>(STORAGE_KEY(uid))) ?? [];
    const now = Date.now();
    const pruned = log.filter(e => now - e.timestamp < MAX_AGE_MS);
    pruned.unshift({ id: crypto.randomUUID(), action, timestamp: now });
    // keep max 200 entries
    await set(STORAGE_KEY(uid), pruned.slice(0, 200));
  } catch {
    // non-critical
  }
}

export async function getActivityLog(uid: string): Promise<ActivityEntry[]> {
  if (!uid) return [];
  try {
    const log: ActivityEntry[] = (await get<ActivityEntry[]>(STORAGE_KEY(uid))) ?? [];
    const now = Date.now();
    return log.filter(e => now - e.timestamp < MAX_AGE_MS);
  } catch {
    return [];
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
