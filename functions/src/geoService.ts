/**
 * Unified ZIP → coordinates resolution layer.
 * Resolution order: Census preload → Firestore cache → External geocoders (Google → Azure).
 */
import type { Firestore } from 'firebase-admin/firestore';
import { lookupZip } from './zipDataset';
import { getCachedGeo, setCachedGeo } from './geoCache';
import { geocodeWithFallback } from './geocoding';

export async function resolveZipCoordinates(
  db: Firestore,
  zip: string,
): Promise<{ lat: number; lng: number; source: string } | null> {
  // 1. Census preload (instant, free)
  const preloaded = lookupZip(zip);
  if (preloaded) return { ...preloaded, source: 'census' };

  // 2. Firestore cache (30-day TTL)
  const cached = await getCachedGeo(db, zip);
  if (cached) return cached;

  // 3. External geocoding providers (Google → Azure)
  const geocoded = await geocodeWithFallback(`${zip}, US`);
  if (geocoded) {
    await setCachedGeo(db, zip, geocoded.lat, geocoded.lng, geocoded.source);
    return geocoded;
  }

  return null;
}
