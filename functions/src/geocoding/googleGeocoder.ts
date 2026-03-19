import type { GeocodingProvider, GeocodingResult } from './types';
import { fetchJson } from '../httpUtil';

export class GoogleGeocoder implements GeocodingProvider {
  readonly name = 'google';

  constructor(private readonly apiKey: string) {}

  async geocode(address: string): Promise<GeocodingResult | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const data = await fetchJson(url) as {
      status: string;
      error_message?: string;
      results: { geometry: { location: { lat: number; lng: number } } }[];
    };

    console.log(`[GoogleGeocoder] status=${data.status} results=${data.results?.length ?? 0}${data.error_message ? ` error=${data.error_message}` : ''}`);

    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) return null;

    return { lat: loc.lat, lng: loc.lng, source: 'google' };
  }
}
