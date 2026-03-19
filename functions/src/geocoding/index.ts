import { GoogleGeocoder } from './googleGeocoder';
import { AzureGeocoder } from './azureGeocoder';
import type { GeocodingProvider, GeocodingResult } from './types';

export type { GeocodingProvider, GeocodingResult };

/** Build the provider chain based on available API keys. */
export function getGeocodingProviders(): GeocodingProvider[] {
  const providers: GeocodingProvider[] = [];
  if (process.env.GOOGLE_PLACES_KEY) {
    providers.push(new GoogleGeocoder(process.env.GOOGLE_PLACES_KEY));
  }
  if (process.env.AZURE_MAPS_KEY) {
    providers.push(new AzureGeocoder(process.env.AZURE_MAPS_KEY));
  }
  return providers;
}

/** Try each provider in order until one succeeds. */
export async function geocodeWithFallback(address: string): Promise<GeocodingResult | null> {
  for (const provider of getGeocodingProviders()) {
    try {
      const result = await provider.geocode(address);
      if (result) return result;
    } catch (err) {
      console.error(`[geocodeWithFallback] ${provider.name} failed:`, err);
    }
  }
  return null;
}
