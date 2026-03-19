import type { GeocodingProvider, GeocodingResult } from './types';
import { fetchJson } from '../httpUtil';

export class AzureGeocoder implements GeocodingProvider {
  readonly name = 'azure';

  constructor(private readonly subscriptionKey: string) {}

  async geocode(address: string): Promise<GeocodingResult | null> {
    const url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&query=${encodeURIComponent(address)}&subscription-key=${this.subscriptionKey}`;
    const data = await fetchJson(url) as {
      results: { position: { lat: number; lon: number } }[];
    };

    const pos = data.results?.[0]?.position;
    if (!pos) {
      console.log('[AzureGeocoder] No results returned');
      return null;
    }

    console.log(`[AzureGeocoder] Resolved: lat=${pos.lat} lng=${pos.lon}`);
    return { lat: pos.lat, lng: pos.lon, source: 'azure' };
  }
}
