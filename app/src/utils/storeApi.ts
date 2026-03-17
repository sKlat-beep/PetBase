/**
 * PetBase Store & Web Discovery API Wrapper
 *
 * getNearbyStores: Scaffolding for Google Places / Yelp store lookups.
 * getPopularWebsites: Curated list of real pet care websites.
 */

export interface StoreResult {
  id: string;
  name: string;
  type: string;
  distance: string;
  address: string;
  image: string;
  isOpen: boolean;
  tags: string[];
}

export interface WebsiteResult {
  id: string;
  name: string;
  url: string;
  logo: string;
  description: string;
}

/**
 * Returns nearby pet stores for the given zip code.
 * TODO: Wire to Google Places API (see Phase 5 in roadmap).
 */
export async function getNearbyStores(_zipCode: string): Promise<StoreResult[]> {
  if (import.meta.env.DEV) {
    console.warn(
      '[PetBase] getNearbyStores() is not implemented yet — returning empty array. See Phase 5 in roadmap.',
    );
  }
  return [];
}

/**
 * Curated list of popular pet care websites.
 * These are real, well-known resources — not mock data.
 */
export async function getPopularWebsites(_zipCode: string): Promise<WebsiteResult[]> {
  return [
    {
      id: 'site-1',
      name: 'Chewy',
      url: 'https://www.chewy.com',
      logo: 'https://logo.clearbit.com/chewy.com',
      description: 'Online retailer of pet food and other pet-related products.',
    },
    {
      id: 'site-2',
      name: 'Petco',
      url: 'https://www.petco.com',
      logo: 'https://logo.clearbit.com/petco.com',
      description: 'Retailer of premium pet food, supplies and services.',
    },
    {
      id: 'site-3',
      name: 'Rover',
      url: 'https://www.rover.com',
      logo: 'https://logo.clearbit.com/rover.com',
      description: 'Find trusted pet sitters and dog walkers.',
    },
    {
      id: 'site-4',
      name: "The Farmer's Dog",
      url: 'https://www.thefarmersdog.com',
      logo: 'https://logo.clearbit.com/thefarmersdog.com',
      description: 'Real, fresh food made for your dog.',
    },
  ];
}
