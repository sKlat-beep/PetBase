/** Shared types for pluggable geocoding providers. */

export interface GeocodingResult {
  lat: number;
  lng: number;
  source: string;
}

export interface GeocodingProvider {
  name: string;
  geocode(address: string): Promise<GeocodingResult | null>;
}
