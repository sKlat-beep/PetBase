/**
 * Breed Intelligence & Pet-Aware Search Taxonomy
 *
 * Provides breed-specific search augments, medical condition mappings,
 * bitmask taxonomy for pet categorization, and the core deriveSearchAugments()
 * function used by the Yelp Orchestrator.
 */

import type { Pet } from '../types/pet';

// ─── Bitmask Taxonomy (16-bit) ─────────────────────────────────────────────────

/** Bits 0-9: Pet Types */
export const PET_TYPE_BITS: Record<string, number> = {
  dog: 0, cat: 1, reptile: 2, bird: 3, fish: 4,
  'small-animal': 5, rabbit: 6, horse: 7, ferret: 8, other: 9,
};

/** Bits 10-13: Derived attributes from 4 core filters */
const ATTR_LARGE_BREED = 1 << 10;
const ATTR_SENIOR      = 1 << 11;
const ATTR_EXOTIC      = 1 << 12;
const ATTR_PUPPY       = 1 << 13;

// ─── Brachycephalic Breeds ─────────────────────────────────────────────────────

export const BRACHYCEPHALIC_BREEDS = new Set([
  'bulldog', 'french bulldog', 'pug', 'boston terrier', 'boxer',
  'shih tzu', 'pekingese', 'cavalier king charles spaniel',
  'brussels griffon', 'lhasa apso',
]);

// ─── Exotic Pet Types ──────────────────────────────────────────────────────────

export const EXOTIC_PET_TYPES = new Set([
  'rabbit', 'bird', 'fish', 'reptile', 'small-animal', 'ferret', 'other',
]);

// ─── Breed-Specific Search Augments ────────────────────────────────────────────

export const BREED_SEARCH_AUGMENTS: Record<string, string[]> = {
  'german shepherd':    ['large breed', 'hip dysplasia aware', 'deshedding'],
  'golden retriever':   ['large breed', 'deshedding', 'joint care'],
  'labrador retriever': ['large breed', 'deshedding', 'joint care'],
  'dachshund':          ['back problems', 'IVDD specialist'],
  'husky':              ['deshedding treatment', 'high energy'],
  'siberian husky':     ['deshedding treatment', 'high energy'],
  'pug':                ['brachycephalic', 'heat-sensitive'],
  'french bulldog':     ['brachycephalic', 'heat-sensitive', 'skin care'],
  'bulldog':            ['brachycephalic', 'heat-sensitive', 'skin fold care'],
  'rottweiler':         ['large breed', 'joint care'],
  'great dane':         ['giant breed', 'bloat aware', 'joint care'],
  'chihuahua':          ['small breed', 'dental care'],
  'yorkshire terrier':  ['small breed', 'dental care', 'coat maintenance'],
  'poodle':             ['hypoallergenic', 'professional grooming'],
  'beagle':             ['scent hound', 'ear care'],
  'boxer':              ['brachycephalic', 'high energy'],
  'doberman':           ['large breed', 'cardiac aware'],
  'bernese mountain dog': ['giant breed', 'deshedding', 'cancer screening'],
  'cocker spaniel':     ['ear care', 'coat maintenance'],
  'shih tzu':           ['brachycephalic', 'coat maintenance'],
};

// ─── Medical Condition → Search Term Mapping ───────────────────────────────────

export const MEDICAL_CONDITION_AUGMENTS: Record<string, string[]> = {
  insulin:       ['diabetic pet care', 'specialized care'],
  phenobarbital: ['seizure management', 'neurology vet'],
  apoquel:       ['allergy specialist', 'dermatology vet'],
  rimadyl:       ['arthritis', 'mobility care'],
  gabapentin:    ['pain management', 'neurology'],
  prednisone:    ['immune condition', 'specialized care'],
  methimazole:   ['thyroid specialist', 'endocrine vet'],
};

// ─── Size Derivation ───────────────────────────────────────────────────────────

export type PetSize = 'Small' | 'Medium' | 'Large' | 'Extra Large';

export function derivePetSize(weightStr?: string): PetSize | null {
  if (!weightStr) return null;
  const w = parseFloat(weightStr);
  if (isNaN(w)) return null;
  if (w < 20) return 'Small';
  if (w <= 50) return 'Medium';
  if (w <= 90) return 'Large';
  return 'Extra Large';
}

// ─── Life Stage Derivation ─────────────────────────────────────────────────────

export type LifeStage = 'Puppy' | 'Adult' | 'Senior';

export function deriveLifeStage(pet: Pet): LifeStage | null {
  const birthday = pet.birthday;
  if (!birthday) return null;
  const ageYears = (Date.now() - new Date(birthday).getTime()) / (365.25 * 86_400_000);
  const type = (pet.type ?? 'dog').toLowerCase();

  if (ageYears < 1) return 'Puppy';
  if (type === 'cat' && ageYears >= 10) return 'Senior';
  if (type === 'dog' && ageYears >= 7) return 'Senior';
  if (ageYears >= 5) return 'Senior'; // default for other types
  return 'Adult';
}

// ─── Bitmask Encoder ───────────────────────────────────────────────────────────

export function encodePetBitmask(pet: Pet): number {
  let mask = 0;
  const type = (pet.type ?? 'dog').toLowerCase();
  const typeBit = PET_TYPE_BITS[type] ?? PET_TYPE_BITS.other;
  mask |= (1 << typeBit);

  const size = derivePetSize(pet.weight);
  if (size === 'Large' || size === 'Extra Large') mask |= ATTR_LARGE_BREED;

  const stage = deriveLifeStage(pet);
  if (stage === 'Senior') mask |= ATTR_SENIOR;
  if (stage === 'Puppy') mask |= ATTR_PUPPY;

  if (EXOTIC_PET_TYPES.has(type)) mask |= ATTR_EXOTIC;

  return mask;
}

// ─── Master Augment Derivation ─────────────────────────────────────────────────

export interface SearchAugments {
  defaultTags: string[];   // Always-on from 4 core filters (non-removable)
  optionalTags: string[];  // User can toggle on/off (breed + medical intelligence)
}

export function deriveSearchAugments(
  pet: Pet,
  medications?: Array<{ name: string }>,
): SearchAugments {
  const defaultTags: string[] = [];
  const optionalTags: string[] = [];

  const type = (pet.type ?? 'dog').toLowerCase();
  const breed = (pet.breed ?? '').toLowerCase();

  // Default: Pet Type
  defaultTags.push(type);

  // Default: Breed
  if (pet.breed) defaultTags.push(pet.breed);

  // Default: Size
  const size = derivePetSize(pet.weight);
  if (size) {
    if (size === 'Large' || size === 'Extra Large') defaultTags.push('large breed');
    else if (size === 'Small') defaultTags.push('small breed');
  }

  // Default: Life Stage
  const stage = deriveLifeStage(pet);
  if (stage === 'Senior') defaultTags.push('senior');
  else if (stage === 'Puppy') defaultTags.push('puppy');

  // Optional: Breed intelligence
  const breedAugments = BREED_SEARCH_AUGMENTS[breed];
  if (breedAugments) {
    for (const aug of breedAugments) {
      if (!defaultTags.includes(aug)) optionalTags.push(aug);
    }
  }

  // Optional: Brachycephalic (derived boolean, not bitmask yet)
  if (BRACHYCEPHALIC_BREEDS.has(breed) && !optionalTags.includes('brachycephalic')) {
    optionalTags.push('brachycephalic specialist');
  }

  // Optional: Exotic
  if (EXOTIC_PET_TYPES.has(type)) {
    optionalTags.push('exotic specialist');
  }

  // Optional: Medical conditions from medications
  if (medications) {
    for (const med of medications) {
      const name = med.name.toLowerCase();
      for (const [keyword, augments] of Object.entries(MEDICAL_CONDITION_AUGMENTS)) {
        if (name.includes(keyword)) {
          for (const aug of augments) {
            if (!optionalTags.includes(aug)) optionalTags.push(aug);
          }
        }
      }
    }
    // 3+ active medications → specialized care
    if (medications.length >= 3 && !optionalTags.includes('specialized care')) {
      optionalTags.push('specialized vet');
    }
  }

  // Optional: Not spayed/neutered
  if (pet.spayedNeutered === 'No') {
    optionalTags.push('spay neuter clinic');
  }

  // Optional: No microchip
  if (!pet.microchipId) {
    optionalTags.push('microchipping');
  }

  return { defaultTags, optionalTags };
}
