/**
 * Tag matching & search augmentation utilities for PetBase search.
 */

import { PET_CATEGORIES, ALL_PET_TAGS, TAG_TO_CATEGORY } from '../data/petTags';

/** Map service type tabs to query augmentation terms */
const SERVICE_TYPE_AUGMENTS: Record<string, Record<string, string>> = {
  Groomers: { dog: 'dog grooming', cat: 'cat grooming', rabbit: 'rabbit grooming', horse: 'horse grooming' },
  Stores: { dog: 'dog supplies pet store', cat: 'cat supplies pet store', fish: 'aquarium fish supplies', reptile: 'reptile supplies' },
  Walkers: { dog: 'dog walking' },
  Trainers: { dog: 'dog training', cat: 'cat behavior', horse: 'horse training' },
  Boarding: { dog: 'dog boarding', cat: 'cat boarding', rabbit: 'rabbit boarding', horse: 'horse boarding' },
  Sitters: { dog: 'pet sitting dog', cat: 'pet sitting cat' },
};

/**
 * Augment a search query with pet-specific terms.
 * Vets and Shelters are already inherently pet-specific — no augmentation needed.
 */
export function buildPetQuery(
  baseQuery: string,
  serviceType: string,
  selectedPetCategories: string[],
): string {
  if (selectedPetCategories.length === 0) return baseQuery;
  if (serviceType === 'Vets' || serviceType === 'Shelters') return baseQuery;

  const augments = SERVICE_TYPE_AUGMENTS[serviceType];
  if (!augments) return baseQuery;

  const terms = selectedPetCategories
    .map(catId => augments[catId])
    .filter(Boolean);

  if (terms.length === 0) return baseQuery;

  // Use first matching term as prefix (avoid overly long queries)
  const prefix = terms[0];
  return baseQuery ? `${prefix} ${baseQuery}` : prefix;
}

/**
 * Match a service result's name and tags against selected pet categories.
 * Returns the matching tag strings.
 */
export function matchResultTags(
  result: { name: string; tags: string[] },
  selectedCategories: string[],
): string[] {
  if (selectedCategories.length === 0) return [];

  const selectedSet = new Set(selectedCategories);
  const matched: string[] = [];

  // Check explicit tags
  for (const tag of result.tags) {
    const cat = TAG_TO_CATEGORY.get(tag);
    if (cat && selectedSet.has(cat)) {
      matched.push(tag);
    }
  }

  // Check name against category labels and common terms
  const nameLower = result.name.toLowerCase();
  for (const catId of selectedCategories) {
    const category = PET_CATEGORIES.find(c => c.id === catId);
    if (!category) continue;
    if (nameLower.includes(category.label.toLowerCase())) {
      matched.push(category.label);
    }
  }

  return [...new Set(matched)];
}

/**
 * Check if a result is pet-relevant (matches ANY pet tag or common pet terms).
 * Used to filter out non-pet results (furniture stores, generic retail, etc.)
 */
export function isPetRelevant(
  result: { name: string; tags: string[]; type: string },
): boolean {
  // Service types that are inherently pet-relevant
  const petServiceTypes = ['Vets', 'Groomers', 'Sitters', 'Walkers', 'Trainers', 'Boarding', 'Shelters'];
  if (petServiceTypes.includes(result.type)) return true;

  // Check if any tag matches the taxonomy
  if (result.tags.some(tag => ALL_PET_TAGS.includes(tag))) return true;

  // Check name for pet-related keywords
  const nameLower = result.name.toLowerCase();
  const petKeywords = [
    'pet', 'animal', 'vet', 'veterinary', 'grooming', 'kennel', 'shelter',
    'dog', 'cat', 'puppy', 'kitten', 'fish', 'aquarium', 'reptile', 'bird',
    'horse', 'equine', 'ferret', 'rabbit', 'bunny', 'paws', 'bark', 'meow',
    'fur', 'feather', 'critter',
  ];
  return petKeywords.some(kw => nameLower.includes(kw));
}
