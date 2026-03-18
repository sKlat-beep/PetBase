/**
 * PetBase Store & Web Discovery API Wrapper
 *
 * getPopularWebsites: Curated list of real pet care websites, organized by category.
 */

export interface WebsiteResult {
  id: string;
  name: string;
  url: string;
  logo: string;
  description: string;
  category?: string;
}

/**
 * Curated list of popular pet care websites.
 * These are real, well-known resources — not mock data.
 */
export async function getPopularWebsites(_zipCode: string): Promise<WebsiteResult[]> {
  return [
    // Shopping
    {
      id: 'site-chewy',
      name: 'Chewy',
      url: 'https://www.chewy.com',
      logo: 'https://logo.clearbit.com/chewy.com',
      description: 'Online retailer of pet food and other pet-related products.',
      category: 'Shopping',
    },
    {
      id: 'site-petco',
      name: 'Petco',
      url: 'https://www.petco.com',
      logo: 'https://logo.clearbit.com/petco.com',
      description: 'Retailer of premium pet food, supplies and services.',
      category: 'Shopping',
    },
    {
      id: 'site-petsmart',
      name: 'PetSmart',
      url: 'https://www.petsmart.com',
      logo: 'https://logo.clearbit.com/petsmart.com',
      description: 'Pet supplies, food, and in-store grooming and training.',
      category: 'Shopping',
    },
    {
      id: 'site-amazon-pets',
      name: 'Amazon Pets',
      url: 'https://www.amazon.com/pet-supplies/b?node=2619533011',
      logo: 'https://logo.clearbit.com/amazon.com',
      description: 'Wide selection of pet supplies with fast delivery.',
      category: 'Shopping',
    },
    {
      id: 'site-barkbox',
      name: 'BarkBox',
      url: 'https://www.barkbox.com',
      logo: 'https://logo.clearbit.com/barkbox.com',
      description: 'Monthly subscription box of toys and treats for dogs.',
      category: 'Shopping',
    },
    // Services
    {
      id: 'site-rover',
      name: 'Rover',
      url: 'https://www.rover.com',
      logo: 'https://logo.clearbit.com/rover.com',
      description: 'Find trusted pet sitters and dog walkers.',
      category: 'Services',
    },
    {
      id: 'site-wag',
      name: 'Wag!',
      url: 'https://wagwalking.com',
      logo: 'https://logo.clearbit.com/wagwalking.com',
      description: 'On-demand dog walking, sitting, and training.',
      category: 'Services',
    },
    {
      id: 'site-1800petmeds',
      name: '1-800-PetMeds',
      url: 'https://www.1800petmeds.com',
      logo: 'https://logo.clearbit.com/1800petmeds.com',
      description: 'Pet pharmacy for prescription and OTC medications.',
      category: 'Services',
    },
    // Food & Nutrition
    {
      id: 'site-farmersdog',
      name: "The Farmer's Dog",
      url: 'https://www.thefarmersdog.com',
      logo: 'https://logo.clearbit.com/thefarmersdog.com',
      description: 'Real, fresh food made for your dog.',
      category: 'Food & Nutrition',
    },
    {
      id: 'site-petplate',
      name: 'PetPlate',
      url: 'https://www.petplate.com',
      logo: 'https://logo.clearbit.com/petplate.com',
      description: 'Fresh, vet-designed meals delivered to your door.',
      category: 'Food & Nutrition',
    },
  ];
}
