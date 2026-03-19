/**
 * ZIP → lat/lng lookup from the bundled Census ZCTA dataset.
 * Loaded once on cold start into a Map for O(1) lookups.
 */
import * as zcta from './data/zcta.json';

const zipMap = new Map<string, [number, number]>(
  Object.entries(zcta).map(([zip, coords]) => [zip, coords as [number, number]])
);

/** Normalize a ZIP string to 5 digits with leading zeros. */
function normalizeZip(zip: string): string {
  return zip.toString().padStart(5, '0');
}

/** Look up coordinates for a US ZIP code. Returns null if not found. */
export function lookupZip(zip: string): { lat: number; lng: number } | null {
  const coords = zipMap.get(normalizeZip(zip));
  return coords ? { lat: coords[0], lng: coords[1] } : null;
}

/** Check if a ZIP code exists in the dataset. */
export function hasZip(zip: string): boolean {
  return zipMap.has(normalizeZip(zip));
}
