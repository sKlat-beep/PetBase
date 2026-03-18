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
import { get, set } from 'idb-keyval';
import { app } from '../lib/firebase';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

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
  location: string;  // ZIP code or 'GPS'
  type: 'Vets' | 'Groomers' | 'Sitters' | 'Walkers' | 'Trainers' | 'Stores' | 'Boarding' | 'Shelters';
  petTypesQuery: string[];   // e.g., ['Dog', 'Cat']
  petBreedsQuery?: string[]; // e.g., ['Golden Retriever']
  petSizesQuery?: string[];  // e.g., ['Large']
  serviceFilters?: string[];
  lat?: number;
  lng?: number;
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
  remainingSearches?: number;
}

export async function searchServices(filters: SearchFilters): Promise<SearchResponse> {
  if (!filters.location) return { results: [] };

  // Cache key uses H3 cell (res 7, ~5km²) when lat/lng available, falling back to
  // ZIP code then raw location string. This deduplicates across nearby ZIP codes
  // that map to the same H3 cell.
  let geoKey = filters.location;
  if (filters.lat != null && filters.lng != null) {
    const { latLngToH3 } = await import('../lib/h3Service');
    geoKey = latLngToH3(filters.lat, filters.lng) ?? filters.location;
  } else if (filters.location?.match(/^\d{5}$/)) {
    const { zipCodeToH3 } = await import('../lib/h3Service');
    geoKey = zipCodeToH3(filters.location) ?? filters.location;
  }
  const cacheKey = `petbase_services_${geoKey}_${filters.type}_${filters.query}`;
  const cached = await get<CachedResult>(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { results: cached.data };
  }

  try {
    const call = httpsCallable<
      { type: string; location: string; query: string; radius?: number },
      { results: ServiceResult[]; error?: { code: string; message: string }; remainingSearches?: number }
    >(getFns(), 'findServices');

    const res = await call({
      type: filters.type,
      location: filters.location,
      query: filters.query,
      ...(filters.lat != null && filters.lng != null ? { lat: filters.lat, lng: filters.lng } : {}),
      ...(filters.radius ? { radius: filters.radius } : {}),
    });

    const { results = [], error, remainingSearches } = res.data;
    if (results.length > 0) {
      await set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
      prefetchTopPlaceDetails(results, 3);
    }
    return { results, error, remainingSearches };
  } catch (err: unknown) {
    const code = (err as any)?.code ?? 'unknown';
    const message = (err as any)?.message ?? String(err);
    console.error(
      `[searchServices] Cloud Function error — code: ${code} | message: ${message}`,
      err,
    );
    if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
      return { results: [], error: { code: 'rate-limited', message: "You've used all 5 searches today." }, remainingSearches: 0 };
    }
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
