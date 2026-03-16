import * as https from 'https';

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
        try { resolve(JSON.parse(data) as { businesses: YelpBusiness[] }); }
        catch (e) { reject(e); }
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
): Promise<YelpBusiness[]> {
  const yelpCategory = YELP_CATEGORY_MAP[category] ?? 'petstore';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    categories: yelpCategory,
    limit: '50',
    radius: '8000',
    sort_by: 'rating',
    ...(query ? { term: query } : {}),
  });
  const data = await fetchYelp(
    `https://api.yelp.com/v3/businesses/search?${params.toString()}`,
    apiKey,
  );
  return data.businesses ?? [];
}
