import * as https from 'https';
import { createLogger } from './logger';

const log = createLogger('placesService');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlacePhoto {
  photoUri: string; // resolved CDN URL
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress?: string;
  phone?: string;       // nationalPhoneNumber
  website?: string;     // websiteUri
  googleMapsUri?: string;
  photos: string[];     // resolved CDN URLs (up to 5)
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
}

export interface PlaceAtmosphere {
  reviews: PlaceReview[];
  priceLevel?: string; // e.g. "PRICE_LEVEL_MODERATE"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fetchJson(url: string, headers?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = headers ? { headers } : {};
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 500)}`));
            return;
          }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Find a Place ID using Text Search (New).
 * Returns the first matching place's ID, or null if not found.
 */
export async function findPlaceId(
  name: string,
  address: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const result = await postJson(
      'https://places.googleapis.com/v1/places:searchText',
      { textQuery: `${name} ${address}`, maxResultCount: 1 },
      {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
    );
    return (result?.places?.[0]?.id as string) ?? null;
  } catch (err) {
    log.error('findPlaceId error', err);
    return null;
  }
}

/**
 * Resolve a photo resource name to a CDN URL via the Photos (New) media endpoint.
 * Returns null on any failure so callers can continue with other photos.
 */
export async function resolvePhotoUrl(
  photoName: string,
  apiKey: string,
  maxWidthPx: number = 800,
): Promise<string | null> {
  try {
    const result = await fetchJson(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${apiKey}`,
    );
    return (result?.photoUri as string) ?? null;
  } catch (err) {
    log.error('resolvePhotoUrl error', err);
    return null;
  }
}

/**
 * Fetch essentials + contact-tier details for a place.
 * Resolves up to 5 photo URLs via Promise.allSettled (failures are silently dropped).
 */
export async function getPlaceDetailsAndContact(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetails> {
  try {
    const result = await fetchJson(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,googleMapsUri,photos',
      },
    );

    const rawPhotos: Array<{ name: string }> = result?.photos ?? [];
    const first5 = rawPhotos.slice(0, 5);

    const photoResults = await Promise.allSettled(
      first5.map((p) => resolvePhotoUrl(p.name, apiKey)),
    );

    const photos = photoResults
      .filter(
        (r): r is PromiseFulfilledResult<string> =>
          r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value);

    return {
      placeId: (result?.id as string) ?? placeId,
      name: (result?.displayName?.text as string) ?? '',
      formattedAddress: result?.formattedAddress as string | undefined,
      phone: result?.nationalPhoneNumber as string | undefined,
      website: result?.websiteUri as string | undefined,
      googleMapsUri: result?.googleMapsUri as string | undefined,
      photos,
    };
  } catch (err) {
    log.error('getPlaceDetailsAndContact error', err);
    return { placeId, name: '', photos: [] };
  }
}

/**
 * Fetch atmosphere-tier data (reviews + price level) for a place.
 * Reviews with no text are filtered out.
 */
export async function getPlaceAtmosphere(
  placeId: string,
  apiKey: string,
): Promise<PlaceAtmosphere> {
  try {
    const result = await fetchJson(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'reviews,priceLevel',
      },
    );

    const rawReviews: Array<any> = result?.reviews ?? [];
    const reviews: PlaceReview[] = rawReviews
      .filter((r) => r?.text?.text)
      .map((r) => ({
        authorName: (r.authorAttribution?.displayName as string) ?? '',
        rating: (r.rating as number) ?? 0,
        text: r.text?.text as string,
        relativePublishTimeDescription:
          (r.relativePublishTimeDescription as string) ?? '',
      }));

    return {
      reviews,
      priceLevel: result?.priceLevel as string | undefined,
    };
  } catch (err) {
    log.error('getPlaceAtmosphere error', err);
    return { reviews: [] };
  }
}
