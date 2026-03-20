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
  isDefault: boolean;    // true = from 4 core filters (non-removable)
  isRemovable: boolean;  // false for default tags
}

export interface OrchestratorInput {
  pet: Pet;
  serviceType: string;
  manualQuery?: string;
  zip: string;
  activeTags: string[];        // User-editable preview tags
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
  petName: string;
  petType: string;
  serviceType: string;
  queryPreview: string;
  zip: string;
  url: string;
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
  const { pet, serviceType, manualQuery, zip, activeTags, medications } = input;
  const type = (pet.type ?? 'dog').toLowerCase();
  const breed = pet.breed ?? '';
  const augments = deriveSearchAugments(pet, medications);

  // Layer 1: Service term
  const speciesExpansions = SERVICE_SPECIES_EXPANSIONS[serviceType]?.[type];
  const serviceTerm = speciesExpansions?.[0] ?? SERVICE_GENERIC[serviceType] ?? 'pet services';

  // Layer 2: Species
  const speciesTerm = type;

  // Layer 3: Breed or group
  const size = derivePetSize(pet.weight);
  const sizePrefix = (size === 'Large' || size === 'Extra Large') ? 'large breed' : '';
  const breedOrGroup = breed
    ? (sizePrefix ? `${sizePrefix} ${breed}` : breed)
    : (sizePrefix || '');

  // Layer 4: Traits (life stage + default augments beyond type/breed/size)
  const traits: string[] = [];
  const stage = deriveLifeStage(pet);
  if (stage === 'Senior') traits.push('senior');
  else if (stage === 'Puppy') traits.push('puppy');

  // Layer 5: Enhancers (optional tags that user has active)
  const enhancers = activeTags.filter(t =>
    augments.optionalTags.includes(t) || !augments.defaultTags.includes(t)
  );

  const layers: QueryLayers = {
    service: serviceTerm,
    species: speciesTerm,
    breedOrGroup,
    traits,
    enhancers,
  };

  // Build query string, prioritizing layers 1→5
  let queryParts: string[];
  if (manualQuery) {
    // Manual query replaces layers 1-2
    queryParts = [manualQuery, breedOrGroup, ...traits, ...enhancers];
  } else {
    queryParts = [serviceTerm, breedOrGroup, ...traits, ...enhancers];
  }

  // Filter empties and cap length
  const filtered = queryParts.filter(Boolean);
  let query = filtered.join(' ');
  if (query.length > MAX_QUERY_LENGTH) {
    // Truncate from the end (drop enhancers first)
    query = query.slice(0, MAX_QUERY_LENGTH).trim();
  }

  const url = `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(zip)}`;

  // Build preview tags
  const previewTags: PreviewTag[] = [];

  // Default tags (non-removable)
  for (const tag of augments.defaultTags) {
    previewTags.push({
      text: tag,
      layer: tag === type ? 'species' : tag === breed ? 'breed' : 'trait',
      isDefault: true,
      isRemovable: false,
    });
  }

  // Service tag
  previewTags.unshift({
    text: serviceTerm,
    layer: 'service',
    isDefault: true,
    isRemovable: false,
  });

  // Optional active tags (removable)
  for (const tag of enhancers) {
    previewTags.push({
      text: tag,
      layer: 'enhancer',
      isDefault: false,
      isRemovable: true,
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
    // Android intent URL — opens Yelp app if installed, falls back to browser
    const encoded = webUrl.replace('https://', '');
    return `intent://${encoded}#Intent;package=com.yelp.android;scheme=https;end`;
  }
  // iOS uses Universal Links — the https URL auto-intercepts if Yelp is installed
  // Desktop uses the web URL directly
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

  // Save to history
  const entry: SearchHistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    petName: input.pet.name,
    petType: input.pet.type ?? 'dog',
    serviceType: input.serviceType,
    queryPreview: result.layers.service + ' ' + result.layers.breedOrGroup,
    zip: input.zip,
    url: result.url,
  };
  saveSearchHistory(entry);

  // Store redirect timestamp for verification modal
  sessionStorage.setItem('petbase_last_redirect', String(Date.now()));

  // Open URL with deep link support
  const finalUrl = buildDeepLink(result.url);
  window.open(finalUrl, '_blank');

  return entry;
}
