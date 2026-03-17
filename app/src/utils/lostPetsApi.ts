import { get, set } from 'idb-keyval';

export interface LostPetAlert {
  id: string;
  petName: string;
  petType: string;
  breed: string;
  image: string;
  ownerName: string;
  ownerPhone: string;
  lastSeenLocation: string;
  reportedAt: number;
  zipCode: string;
}

const CACHE_KEY = 'petbase-lost-pets';
const GRACE_PERIOD = 15 * 60 * 1000;        // 15 minutes
const EXPIRATION   = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Reads all alerts from IndexedDB, purges expired entries (older than 3 days),
 * writes the cleaned list back, then returns active alerts for the given zip code.
 *
 * Purging on read ensures stale data doesn't accumulate indefinitely, reducing
 * the storage attack surface for sensitive lost-pet information.
 */
export async function getActiveLostPets(zipCode: string): Promise<LostPetAlert[]> {
  try {
    const all: LostPetAlert[] = (await get<LostPetAlert[]>(CACHE_KEY)) ?? [];
    const now = Date.now();

    // Separate expired from live — purge expired entries
    const live = all.filter(a => (now - a.reportedAt) <= EXPIRATION);
    if (live.length < all.length) {
      await set(CACHE_KEY, live);
    }

    return live
      .filter(alert => {
        const matchesZip = !zipCode || alert.zipCode === zipCode;
        const isPastGrace = (now - alert.reportedAt) >= GRACE_PERIOD;
        return matchesZip && isPastGrace;
      })
      .sort((a, b) => b.reportedAt - a.reportedAt);
  } catch {
    return [];
  }
}

/** Persist the full list of lost-pet alerts to IndexedDB. */
export async function writeLostPets(alerts: LostPetAlert[]): Promise<void> {
  try {
    await set(CACHE_KEY, alerts);
  } catch {
    // Non-critical
  }
}
