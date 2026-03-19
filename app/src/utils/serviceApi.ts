/**
 * PetBase Service Search API Wrapper
 *
 * Calls the `findServices` Firebase Cloud Function which proxies the Google
 * Places Text Search API server-side so the API key never appears in the
 * client bundle.
 *
 * Set the key once via:
 *   firebase functions:secrets:set GOOGLE_PLACES_KEY
 * Then deploy:
 *   firebase deploy --only functions
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { get, set } from 'idb-keyval';
import { app, db } from '../lib/firebase';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min (reduced for faster shared cache refresh)
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedResult {
  data: ServiceResult[];
  expiresAt: number;
}

export interface ServiceResult {
  id: string;
  name: string;
  type: string;
  rating: number;
  reviews: number;
  distance: string;
  address: string;
  image: string;
  /** True = business is Google/Yelp verified */
  isVerified: boolean;
  /** True = business metadata explicitly matches the user's pet types/breeds/sizes */
  petVerified: boolean;
  tags: string[];
  communityTips?: {
    text: string;
    author: string;
    date: string;
    rating?: number;
    upvotes?: number;
    upvoters?: string[];
  }[];
  yelpUrl?: string;
  googleUrl?: string;
  isPetBaseVerified?: boolean;
  isSponsored?: boolean;
  claimedByUid?: string;
  bio?: string;
  specialties?: string[];
  socialLinks?: Record<string, string>;
  status?: 'seeded' | 'claimed' | 'verified';
}

export interface SearchFilters {
  query: string;
  location: string;  // 5-digit ZIP code
  type: 'Vets' | 'Groomers' | 'Sitters' | 'Walkers' | 'Trainers' | 'Stores' | 'Boarding' | 'Shelters';
  petTypesQuery: string[];   // e.g., ['Dog', 'Cat']
  petBreedsQuery?: string[]; // e.g., ['Golden Retriever']
  petSizesQuery?: string[];  // e.g., ['Large']
  serviceFilters?: string[];
  radius?: number;
}

let _functions: ReturnType<typeof getFunctions> | null = null;
function getFns() {
  if (!_functions) _functions = getFunctions(app, 'us-central1');
  return _functions;
}

/**
 * Search for local pet services via the findServices Cloud Function.
 * Falls back to an empty array if the function is not deployed or the API key
 * has not been set yet.
 */
export interface SearchResponse {
  results: ServiceResult[];
  error?: { code: string; message: string };
}

/**
 * Read zipCache directly from Firestore (client-side, bypasses Cloud Function).
 * Returns ServiceResult[] if cache hit, null if miss or expired.
 */
async function readZipCacheFromFirestore(zip: string, type: string): Promise<{ results: ServiceResult[]; stale: boolean } | null> {
  try {
    const zipCacheSnap = await getDoc(doc(db, 'zipCache', `${zip}_${type}`));
    if (!zipCacheSnap.exists()) return null;
    const data = zipCacheSnap.data();
    const ageMs = Date.now() - ((data.cachedAt as number) ?? 0);
    if (ageMs > SEVEN_DAYS_MS) return null; // expired

    const serviceIds: string[] = data.serviceIds ?? [];
    if (serviceIds.length === 0) return null;
    const serviceDocs = await Promise.all(
      serviceIds.map(id => getDoc(doc(db, 'services', id)))
    );
    const results: ServiceResult[] = serviceDocs
      .filter(d => d.exists())
      .map(d => {
        const s = d.data()!;
        return {
          id: d.id, name: s.name, type: s.category, rating: s.rating ?? 0,
          reviews: s.reviewCount ?? 0, distance: s.distanceMeters ? `${(s.distanceMeters / 1609.34).toFixed(1)} mi` : '',
          address: s.address ?? '', image: s.photos?.[0] ?? '',
          isVerified: s.isPetBaseVerified ?? false, petVerified: false,
          tags: s.specialties ?? [], yelpUrl: s.yelpUrl,
          isPetBaseVerified: s.isPetBaseVerified, isSponsored: s.isSponsored,
          status: s.status, specialties: s.specialties ?? [],
        };
      });
    return { results, stale: ageMs >= TWO_DAYS_MS };
  } catch (err) {
    console.warn('[readZipCacheFromFirestore] error:', err);
    return null;
  }
}

export async function searchServices(filters: SearchFilters): Promise<SearchResponse> {
  if (!filters.location) return { results: [] };

  // Cache key uses raw ZIP code (no H3 conversion needed)
  const cacheKey = `petbase_services_${filters.location}_${filters.type}_${filters.query}`;

  // 1. Check IndexedDB cache (30 min TTL)
  const cached = await get<CachedResult>(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { results: cached.data };
  }

  // 2. Check Firestore zipCache directly (no Cloud Function invocation)
  const isZip = /^\d{5}$/.test(filters.location);
  if (isZip) {
    const firestoreResult = await readZipCacheFromFirestore(filters.location, filters.type);
    if (firestoreResult) {
      // Store in IndexedDB for subsequent instant hits
      await set(cacheKey, { data: firestoreResult.results, expiresAt: Date.now() + CACHE_TTL_MS });
      // If stale (2-7 days), fire Cloud Function in background to refresh
      if (firestoreResult.stale) {
        callFindServices(filters).catch(() => {});
      }
      return { results: firestoreResult.results };
    }
  }

  // 3. Fall through to Cloud Function (last resort)
  return callFindServices(filters);
}

/** Call the findServices Cloud Function directly. */
async function callFindServices(filters: SearchFilters): Promise<SearchResponse> {
  const cacheKey = `petbase_services_${filters.location}_${filters.type}_${filters.query}`;
  try {
    const call = httpsCallable<
      { type: string; location: string; query: string; radius?: number },
      { results: ServiceResult[]; error?: { code: string; message: string } }
    >(getFns(), 'findServices');

    const res = await call({
      type: filters.type,
      location: filters.location,
      query: filters.query,
      ...(filters.radius ? { radius: filters.radius } : {}),
    });

    const { results = [], error } = res.data;
    if (results.length > 0) {
      await set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
      prefetchTopPlaceDetails(results, 3);
    }
    return { results, error };
  } catch (err: unknown) {
    const code = (err as any)?.code ?? 'unknown';
    const message = (err as any)?.message ?? String(err);
    console.error(`[searchServices] Cloud Function error — code: ${code} | message: ${message}`, err);
    return { results: [], error: { code: 'api-error', message: 'Service temporarily unavailable. Please try again.' } };
  }
}

/**
 * Pre-fetch place details for the top N search results in the background.
 * Results are server-side cached in Firestore, so subsequent getPlaceDetails
 * calls for these services will be instant cache hits.
 */
export function prefetchTopPlaceDetails(results: ServiceResult[], count = 3): void {
  results.slice(0, count).forEach(result => {
    // Fire-and-forget — don't block the UI
    getPlaceDetails(result.id, result.name, result.address).catch(() => {});
  });
}

// ─── Google Places enrichment ─────────────────────────────────────────────────

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress?: string;
  phone?: string;
  website?: string;
  googleMapsUri?: string;
  photos: string[];
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
}

export interface PlaceAtmosphere {
  reviews: PlaceReview[];
  priceLevel?: string;
}

export async function getPlaceDetails(serviceId: string, name: string, address: string): Promise<PlaceDetails | null> {
  try {
    const call = httpsCallable<
      { serviceId: string; name: string; address: string },
      { details: PlaceDetails | null; flagged?: boolean }
    >(getFns(), 'getPlaceDetails');
    const res = await call({ serviceId, name, address });
    return res.data.details ?? null;
  } catch {
    return null;
  }
}

export async function getPlaceReviews(placeId: string): Promise<PlaceAtmosphere | null> {
  try {
    const call = httpsCallable<
      { placeId: string },
      { atmosphere: PlaceAtmosphere | null; flagged?: boolean }
    >(getFns(), 'getPlaceReviews');
    const res = await call({ placeId });
    return res.data.atmosphere ?? null;
  } catch {
    return null;
  }
}

/**
 * Clear all cached service search results from IndexedDB.
 */
export async function clearServiceCache(): Promise<void> {
  const { keys, del } = await import('idb-keyval');
  const allKeys = await keys();
  const serviceKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('petbase_services_'));
  await Promise.all(serviceKeys.map(k => del(k)));
}
