/**
 * Firestore-backed TTL cache for ZIP → lat/lng geocoding results.
 * Collection: zipGeo/{zip}
 * TTL: 30 days (via Firestore native TTL on expiresAt field + defense-in-depth check).
 */
import type { Firestore } from 'firebase-admin/firestore';

interface GeoCacheEntry {
  lat: number;
  lng: number;
  source: string;
  cachedAt: number;
  expiresAt: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Retrieve cached geo coordinates for a ZIP code.
 * Returns null if not found or expired (defense-in-depth, since Firestore
 * native TTL deletion is eventually consistent).
 */
export async function getCachedGeo(
  db: Firestore,
  zip: string,
): Promise<{ lat: number; lng: number; source: string } | null> {
  const snap = await db.doc(`zipGeo/${zip}`).get();
  if (!snap.exists) return null;

  const data = snap.data() as GeoCacheEntry;
  if (data.expiresAt && data.expiresAt < Date.now()) return null;

  return { lat: data.lat, lng: data.lng, source: data.source };
}

/**
 * Store geo coordinates in the cache with a 30-day TTL.
 * Sets both cachedAt and expiresAt (for Firestore native TTL policy).
 */
export async function setCachedGeo(
  db: Firestore,
  zip: string,
  lat: number,
  lng: number,
  source: string,
): Promise<void> {
  const now = Date.now();
  const entry: GeoCacheEntry = {
    lat,
    lng,
    source,
    cachedAt: now,
    expiresAt: now + THIRTY_DAYS_MS,
  };
  await db.doc(`zipGeo/${zip}`).set(entry);
}
