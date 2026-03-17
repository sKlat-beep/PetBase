/**
 * h3Service — H3 Hexagonal Grid Utilities for Privacy-Preserving Geo-Indexing
 *
 * Uses h3-js to map coordinates to hexagonal cells at Resolution 7 (~5.16 km²).
 * Cell indexes replace exact coordinates in Firestore — no GPS data is stored.
 *
 * Resolution guide:
 *   Res 5 → ~253 km²  (city-level)
 *   Res 7 → ~5.16 km² (neighborhood-level) ← default
 *   Res 9 → ~0.105 km² (block-level)
 */

import { latLngToCell, gridDisk } from 'h3-js';

export const H3_RESOLUTION = 7;

/** Convert lat/lng to an H3 cell index. */
export function latLngToH3(lat: number, lng: number, resolution = H3_RESOLUTION): string {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Returns the center cell + all cells within k rings.
 * k=1 → 7 cells (~neighborhood + adjacent), k=2 → 19 cells (~borough).
 * Firestore `in` operator supports up to 30 values.
 */
export function getH3KRing(h3Index: string, k = 1): string[] {
  return gridDisk(h3Index, k);
}

/**
 * Request the user's current position via the browser Geolocation API and
 * return its H3 cell index. Returns null if unavailable or denied.
 */
export function requestGeolocationH3(resolution = H3_RESOLUTION): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(latLngToH3(pos.coords.latitude, pos.coords.longitude, resolution)),
      () => resolve(null),
      { timeout: 6000, maximumAge: 300_000 }, // 5-min cache for battery efficiency
    );
  });
}

// ─── Zip Code → approximate lat/lng lookup ────────────────────────────────────
// Covers major US metropolitan areas. Falls back to null for unknown zip codes.
const ZIP_LATLNG: Record<string, [number, number]> = {
  '10001': [40.7484, -73.9967], '10451': [40.8448, -73.9285],
  '11201': [40.6928, -73.9903], '11101': [40.7477, -73.9375],
  '10301': [40.6295, -74.0938], '02101': [42.3601, -71.0589],
  '19101': [39.9526, -75.1652], '21201': [39.2904, -76.6122],
  '30301': [33.7490, -84.3880], '27601': [35.7796, -78.6382],
  '28201': [35.2271, -80.8431], '37201': [36.1627, -86.7816],
  '33101': [25.7617, -80.1918], '33602': [27.9506, -82.4572],
  '32801': [28.5383, -81.3792], '70112': [29.9511, -90.0715],
  '60601': [41.8858, -87.6181], '53201': [43.0389, -87.9065],
  '46201': [39.7684, -86.1581], '43201': [39.9612, -82.9988],
  '45201': [39.1031, -84.5120], '44101': [41.4993, -81.6944],
  '49201': [42.2459, -84.4013], '55401': [44.9778, -93.2650],
  '63101': [38.6270, -90.1994], '64101': [39.0997, -94.5786],
  '35201': [33.5186, -86.8104], '77001': [29.7543, -95.3677],
  '78201': [29.4241, -98.4936], '78701': [30.2672, -97.7431],
  '75201': [32.7767, -96.7970], '73101': [35.4676, -97.5164],
  '85001': [33.4484, -112.0740], '85701': [32.2226, -110.9747],
  '80201': [39.7392, -104.9903], '84101': [40.7608, -111.8910],
  '89101': [36.1699, -115.1398], '97201': [45.5051, -122.6750],
  '98101': [47.6062, -122.3321], '99501': [61.2181, -149.9003],
  '94102': [37.7749, -122.4194], '95101': [37.3382, -121.8863],
  '92101': [32.7157, -117.1611], '92801': [33.8353, -117.9145],
  '90001': [33.9731, -118.2479], '90210': [34.0901, -118.4065],
  '15201': [40.4406, -79.9959],
};

/**
 * Derive an H3 cell index from a zip code using the lookup table.
 * Returns null for unknown zip codes.
 */
export function zipCodeToH3(zipCode: string, resolution = H3_RESOLUTION): string | null {
  const coords = ZIP_LATLNG[zipCode?.trim()];
  if (!coords) return null;
  return latLngToH3(coords[0], coords[1], resolution);
}

/**
 * Best-effort H3 index for a user:
 * 1. Try browser geolocation (highest accuracy)
 * 2. Fall back to zip code lookup
 * 3. Return null if neither is available
 */
export async function resolveUserH3(zipCode?: string, resolution = H3_RESOLUTION): Promise<string | null> {
  const geoH3 = await requestGeolocationH3(resolution);
  if (geoH3) return geoH3;
  if (zipCode) return zipCodeToH3(zipCode, resolution);
  return null;
}
