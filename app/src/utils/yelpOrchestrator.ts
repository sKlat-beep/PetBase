/**
 * Pet-Aware Yelp Orchestrator
 *
 * 5-layer URL builder that constructs high-intent Yelp search URLs from
 * pet profile data. Replaces the API-backed search as the primary search
 * experience — no Cloud Function calls, no caching needed.
 *
 * Privacy: NEVER includes pet name, owner info, microchip, or notes in URLs.
 */

import type { Pet } from '../types/pet';
import { deriveSearchAugments, derivePetSize, deriveLifeStage } from '../data/breedIntelligence';
import { trackSearchTerm } from '../lib/searchAnalytics';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface QueryLayers {
  service: string;       // Layer 1: "grooming"
  species: string;       // Layer 2: "dog"
  breedOrGroup: string;  // Layer 3: "German Shepherd" or "large breed dog"
  traits: string[];      // Layer 4: ["senior", "deshedding"]
  enhancers: string[];   // Layer 5: ["specialist", "fear free"]
}

export interface PreviewTag {
  text: string;
  layer: 'service' | 'species' | 'breed' | 'trait' | 'enhancer';
  isDefault: boolean;    // true = from core filters
  isRemovable: boolean;  // true = toggleable (defaults ON but can be disabled)
  sourceId?: string;     // pet origin ID
  isPinned?: boolean;    // custom pinned tag
}

export interface OrchestratorInput {
  pets: Pet[];
  serviceType: string;
  manualQuery?: string;
  zip: string;
  activeTags: string[];        // User-editable preview tags
  disabledDefaultTags: string[];
  customTags: string[];
  medications?: Array<{ name: string }>;
}

export interface OrchestratorOutput {
  url: string;
  layers: QueryLayers;
  previewTags: PreviewTag[];
}

export interface SearchHistoryEntry {
  id: string;
  timestamp: number;
  petNames: string[];
  petType: string;
  serviceType: string;
  queryPreview: string;
  zip: string;
  url: string;
}

export interface CustomTag {
  text: string;
  pinnedAt: number;
}

// ─── Service × Species Expansions ──────────────────────────────────────────────

const SERVICE_SPECIES_EXPANSIONS: Record<string, Record<string, string[]>> = {
  Vets: {
    dog:     ['veterinarian', 'dog vet', 'animal hospital'],
    cat:     ['cat veterinarian', 'feline specialist', 'cat-only vet'],
    reptile: ['exotic vet', 'reptile specialist', 'herp vet'],
    bird:    ['avian vet', 'bird veterinarian', 'avian specialist'],
    fish:    ['aquatic veterinarian', 'fish vet'],
    horse:   ['equine veterinarian', 'large animal vet'],
    rabbit:  ['exotic vet', 'rabbit veterinarian'],
    ferret:  ['exotic vet', 'ferret veterinarian'],
    'small-animal': ['exotic vet', 'small animal veterinarian'],
  },
  Groomers: {
    dog:     ['dog grooming', 'large breed grooming', 'shedding treatment', 'deshedding'],
    cat:     ['cat grooming', 'lion cut', 'cat nail trim', 'cat bathing'],
    rabbit:  ['rabbit grooming', 'rabbit nail trimming'],
    horse:   ['horse grooming', 'equine grooming', 'mane braiding'],
    ferret:  ['ferret grooming', 'ferret nail trimming'],
  },
  Boarding: {
    dog:     ['dog boarding', 'dog kennel', 'doggy daycare', 'pet hotel'],
    cat:     ['cat boarding', 'cat hotel', 'cat-only boarding'],
    horse:   ['horse boarding', 'horse stable', 'equine boarding'],
    reptile: ['exotic pet boarding', 'reptile boarding'],
    bird:    ['bird boarding', 'avian boarding'],
  },
  Trainers: {
    dog:     ['dog training', 'obedience training', 'puppy training', 'agility'],
    cat:     ['cat behavior consultant', 'cat training'],
    horse:   ['horse training', 'equine trainer', 'riding lessons'],
  },
  Walkers: {
    dog: ['dog walking', 'dog walker', 'pet walking service'],
  },
  Sitters: {
    dog: ['pet sitting', 'dog sitting', 'house sitting pet'],
    cat: ['cat sitting', 'cat sitter', 'house sitting cat'],
  },
  Stores: {
    dog:     ['pet store', 'dog supplies', 'pet food store'],
    cat:     ['pet store', 'cat supplies'],
    fish:    ['aquarium store', 'fish supplies', 'aquarium shop'],
    reptile: ['reptile supplies', 'reptile store'],
  },
  Shelters: {
    dog: ['animal shelter', 'dog rescue', 'pet adoption'],
    cat: ['animal shelter', 'cat rescue', 'pet adoption'],
  },
};

// Fallback generic terms per service type
const SERVICE_GENERIC: Record<string, string> = {
  Vets: 'veterinarian',
  Groomers: 'pet grooming',
  Boarding: 'pet boarding',
  Trainers: 'pet training',
  Walkers: 'dog walking',
  Sitters: 'pet sitting',
  Stores: 'pet store',
  Shelters: 'animal shelter',
};

// ─── 5-Layer URL Builder ───────────────────────────────────────────────────────

const MAX_QUERY_LENGTH = 120;

export function buildYelpURL(input: OrchestratorInput): OrchestratorOutput {
  const { pets, serviceType, manualQuery, zip, activeTags, disabledDefaultTags, customTags, medications } = input;
  const isEverything = serviceType === 'Everything';

  // Merge augments across all selected pets
  const allDefaultTags: PreviewTag[] = [];
  const allOptionalTags: string[] = [];
  const seenDefaults = new Set<string>();
  const seenOptionals = new Set<string>();

  for (const pet of pets) {
    const type = (pet.type ?? 'dog').toLowerCase();
    const breed = pet.breed ?? '';
    const augments = deriveSearchAugments(pet, medications);

    for (const tag of augments.defaultTags) {
      if (!seenDefaults.has(tag)) {
        seenDefaults.add(tag);
        allDefaultTags.push({
          text: tag,
          layer: tag === type ? 'species' : tag === breed ? 'breed' : 'trait',
          isDefault: true,
          isRemovable: true,
          sourceId: pet.id,
        });
      }
    }

    for (const tag of augments.optionalTags) {
      if (!seenOptionals.has(tag)) {
        seenOptionals.add(tag);
        allOptionalTags.push(tag);
      }
    }
  }

  // Service term — use first pet's species for expansion lookup
  const primaryType = pets.length > 0 ? (pets[0].type ?? 'dog').toLowerCase() : 'dog';
  const speciesExpansions = SERVICE_SPECIES_EXPANSIONS[serviceType]?.[primaryType];
  const serviceTerm = isEverything ? '' : (speciesExpansions?.[0] ?? SERVICE_GENERIC[serviceType] ?? 'pet services');

  // Build layers from first pet (for display purposes)
  const firstPet = pets[0];
  const firstType = firstPet ? (firstPet.type ?? 'dog').toLowerCase() : '';
  const firstBreed = firstPet?.breed ?? '';
  const size = firstPet ? derivePetSize(firstPet.weight) : '';
  const sizePrefix = (size === 'Large' || size === 'Extra Large') ? 'large breed' : '';
  const breedOrGroup = firstBreed
    ? (sizePrefix ? `${sizePrefix} ${firstBreed}` : firstBreed)
    : (sizePrefix || '');

  const traits: string[] = [];
  if (firstPet) {
    const stage = deriveLifeStage(firstPet);
    if (stage === 'Senior') traits.push('senior');
    else if (stage === 'Puppy') traits.push('puppy');
  }

  // Enhancers from active optional tags
  const enhancers = activeTags.filter(t =>
    allOptionalTags.includes(t) || !seenDefaults.has(t)
  );

  const layers: QueryLayers = {
    service: serviceTerm || 'pet services',
    species: firstType,
    breedOrGroup,
    traits,
    enhancers,
  };

  // Active default tag texts (not disabled)
  const activeDefaults = allDefaultTags
    .filter(t => !disabledDefaultTags.includes(t.text))
    .map(t => t.text);

  // Build query string — priority: service term → active defaults → enhancers → custom tags
  const queryParts: string[] = [];

  if (manualQuery) {
    queryParts.push(manualQuery);
  } else {
    if (!isEverything && serviceTerm) {
      queryParts.push(serviceTerm);
    }
    queryParts.push(...activeDefaults);
    queryParts.push(...enhancers);
    queryParts.push(...customTags);
  }

  // Filter empties and cap length
  const filtered = queryParts.filter(Boolean);
  let query = filtered.join(' ');
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.slice(0, MAX_QUERY_LENGTH).trim();
  }

  const url = `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(zip)}`;

  // Build preview tags
  const previewTags: PreviewTag[] = [];

  // Service tag (if not Everything)
  if (!isEverything && serviceTerm) {
    previewTags.push({
      text: serviceTerm,
      layer: 'service',
      isDefault: true,
      isRemovable: true,
    });
  }

  // Default tags (toggleable)
  for (const tag of allDefaultTags) {
    previewTags.push(tag);
  }

  // Optional active tags (removable)
  for (const tag of enhancers) {
    previewTags.push({
      text: tag,
      layer: 'enhancer',
      isDefault: false,
      isRemovable: true,
    });
  }

  // Custom pinned tags
  for (const tag of customTags) {
    previewTags.push({
      text: tag,
      layer: 'enhancer',
      isDefault: false,
      isRemovable: true,
      isPinned: true,
    });
  }

  return { url, layers, previewTags };
}

// ─── Platform Detection & Deep Links ───────────────────────────────────────────

export function detectPlatform(): 'android' | 'ios' | 'desktop' {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'desktop';
}

export function buildDeepLink(webUrl: string): string {
  const platform = detectPlatform();
  if (platform === 'android') {
    const encoded = webUrl.replace('https://', '');
    return `intent://${encoded}#Intent;package=com.yelp.android;scheme=https;end`;
  }
  return webUrl;
}

// ─── Search History (localStorage) ─────────────────────────────────────────────

const HISTORY_KEY = 'petbase_orchestrator_history';
const MAX_HISTORY = 5;

export function loadSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSearchHistory(entry: SearchHistoryEntry): void {
  const history = loadSearchHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ─── Main Orchestrator Entry Point ─────────────────────────────────────────────

export function openYelpSearch(input: OrchestratorInput): SearchHistoryEntry {
  const result = buildYelpURL(input);

  const petNames = input.pets.map(p => p.name);

  // Save to history
  const entry: SearchHistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    petNames,
    petType: input.pets[0]?.type ?? 'dog',
    serviceType: input.serviceType,
    queryPreview: result.layers.service + ' ' + result.layers.breedOrGroup,
    zip: input.zip,
    url: result.url,
  };
  saveSearchHistory(entry);

  // Track manual search terms
  if (input.manualQuery) {
    trackSearchTerm(input.manualQuery);
  }

  // Store redirect timestamp for verification modal
  sessionStorage.setItem('petbase_last_redirect', String(Date.now()));

  // Open URL with deep link support
  const finalUrl = buildDeepLink(result.url);
  window.open(finalUrl, '_blank');

  return entry;
}
