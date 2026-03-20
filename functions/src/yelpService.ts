import * as https from 'https';
import { createLogger } from './logger';

const log = createLogger('fetchYelp');

export const YELP_CATEGORY_MAP: Record<string, string> = {
  Vets: 'vets',
  Groomers: 'petgroomers',
  Sitters: 'petsitting',
  Walkers: 'dogwalkers',
  Trainers: 'pettraining',
  Stores: 'petstore',
  Boarding: 'dogboarding',
  Shelters: 'animalshelters',
};

export interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  location: { display_address: string[] };
  coordinates: { latitude: number; longitude: number };
  phone: string;
  url: string;
  image_url: string;
  categories: { alias: string; title: string }[];
  distance?: number;
}

function fetchYelp(url: string, apiKey: string): Promise<{ businesses: YelpBusiness[] }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${apiKey}` } }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode !== 200) {
            log.error(`HTTP ${res.statusCode}`, new Error(JSON.stringify(parsed).slice(0, 500)));
            reject(new Error(`Yelp API error: HTTP ${res.statusCode}`));
            return;
          }
          resolve(parsed as { businesses: YelpBusiness[] });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

export async function findServicesYelp(
  lat: number,
  lng: number,
  category: string,
  apiKey: string,
  query?: string,
  radius: number = 8000,
): Promise<YelpBusiness[]> {
  const yelpCategory = YELP_CATEGORY_MAP[category] ?? 'petstore';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    categories: yelpCategory,
    limit: '50',
    radius: String(Math.min(Math.max(Math.round(radius), 1), 40000)),
    sort_by: 'rating',
    ...(query ? { term: query } : {}),
  });
  const data = await fetchYelp(
    `https://api.yelp.com/v3/businesses/search?${params.toString()}`,
    apiKey,
  );
  return data.businesses ?? [];
}
