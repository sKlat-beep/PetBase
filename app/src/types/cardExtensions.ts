// app/src/types/cardExtensions.ts
// Foundation module: types, constants, helpers, and typed accessors for Pet Cards feature.
// Extracted from Cards.tsx to eliminate (pet as any).x call-sites in rendering code.

import type { Pet, EmergencyContacts } from './pet';
import type { PublicCardPetSnapshot } from '../lib/firestoreService';

export type { EmergencyContacts };

export interface Vaccine { name: string; lastDate?: string; nextDueDate?: string; }
export interface Medication { name: string; dosage?: string; frequency?: string; customFrequency?: string; startDate?: string; endDate?: string; notes?: string; }
export type CardTemplate = 'vet' | 'sitter' | 'emergency' | 'custom';
export type CardStatus = 'active' | 'expired' | 'revoked';
export type MultiPetConfig = { petId: string; sharing: SharingToggles; petSnapshot?: PublicCardPetSnapshot }[];

export interface SharingToggles {
  basicInfo: boolean;
  medicalOverview: boolean;
  vaccineRecords: boolean;
  medications: boolean;
  microchip: boolean;
  diet: boolean;
  emergencyContact: boolean;
  vetInfo: boolean;
  personalityPlay: boolean;
}

export interface PetCard {
  id: string;
  petId: string;           // 'all-pets' | 'multi-pet' | actual pet id
  template: CardTemplate;
  createdAt: number;
  expiresAt: number;
  status: CardStatus;
  sharing: SharingToggles; // used for single/all-pets; per-pet overrides in multiPetConfig
  multiPetConfig?: MultiPetConfig;
  revokedAt?: number;
  includeGeneralInfo?: boolean;
  petSnapshot?: PublicCardPetSnapshot;
  fieldOrder?: string[];
}

export const GENERAL_INFO_KEY = 'petbase-cards-general-info';
export const CUSTOM_TEMPLATE_KEY = 'petbase-custom-card-template';
export const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_INACTIVE_CARDS = 10;

export const EXPIRATION_OPTIONS: { label: string; ms: number }[] = [
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '48 hours', ms: 48 * 60 * 60 * 1000 },
  { label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '1 month', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '3 months', ms: 90 * 24 * 60 * 60 * 1000 },
  { label: '6 months', ms: 180 * 24 * 60 * 60 * 1000 },
  { label: '1 year', ms: 365 * 24 * 60 * 60 * 1000 },
];

export const TEMPLATE_DEFAULTS: Record<string, SharingToggles> = {
  vet: { basicInfo: true, medicalOverview: true, vaccineRecords: true, medications: true, microchip: true, diet: true, emergencyContact: false, vetInfo: true, personalityPlay: true },
  sitter: { basicInfo: false, medicalOverview: false, vaccineRecords: false, medications: true, microchip: true, diet: true, emergencyContact: true, vetInfo: true, personalityPlay: true },
  emergency: { basicInfo: false, medicalOverview: false, vaccineRecords: false, medications: false, microchip: false, diet: false, emergencyContact: false, vetInfo: false, personalityPlay: false },
  custom: { basicInfo: false, medicalOverview: false, vaccineRecords: false, medications: false, microchip: false, diet: false, emergencyContact: false, vetInfo: false, personalityPlay: false },
};

export const TEMPLATE_LABELS: Record<string, string> = {
  vet: 'Vet Card',
  sitter: 'Sitter Card',
  emergency: 'Custom Card',
  custom: 'Custom Card',
};

export const TEMPLATE_COLORS: Record<string, string> = {
  vet: 'bg-blue-600',
  sitter: 'bg-emerald-600',
  emergency: 'bg-rose-600',
  custom: 'bg-rose-600',
};

export function getCardStatus(card: PetCard): CardStatus {
  if (card.status === 'revoked') return 'revoked';
  if (Date.now() > card.expiresAt) return 'expired';
  return 'active';
}

export function formatExpiry(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeUntilExpiry(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  return `${hours}h remaining`;
}

export function isPetDataStale(card: PetCard, pet: Pet): boolean {
  const snap = card.petSnapshot;
  if (!snap) return false;
  const keys = ['name', 'breed', 'type', 'image', 'weight', 'birthday', 'age',
    'food', 'foodBrand', 'foodAmount', 'foodUnit', 'dislikes', 'spayedNeutered',
    'likes', 'favoriteActivities', 'typeOfPlay', 'activity'] as const;
  for (const k of keys) {
    if (JSON.stringify((pet as any)[k]) !== JSON.stringify((snap as any)[k])) return true;
  }
  if (card.sharing.microchip && (pet as any).microchipId !== (snap as any).microchipId) return true;
  return false;
}

/** Typed accessor helpers — centralize all (pet as any).x casts here. */
export function getPetVaccines(pet: Pet): Vaccine[] {
  return (pet as any).vaccines ?? [];
}

export function getPetMedications(pet: Pet): Medication[] {
  return (pet as any).medications ?? [];
}

export function getPetSpayedNeutered(pet: Pet): string | undefined {
  return (pet as any).spayedNeutered;
}

export function getPetFavoriteActivities(pet: Pet): string[] | undefined {
  return (pet as any).favoriteActivities;
}

export function getPetTypeOfPlay(pet: Pet): string | undefined {
  return (pet as any).typeOfPlay;
}

/** Single sanctioned coercion: converts a live Pet into a PublicCardPetSnapshot shape. */
export function petAsSnapshot(pet: Pet): PublicCardPetSnapshot {
  return pet as unknown as PublicCardPetSnapshot;
}

export function buildPetSnapshot(
  pet: Pet,
  sharing: SharingToggles,
  includeGeneralInfo: boolean,
  generalInfoText: string,
  uid: string | undefined,
): PublicCardPetSnapshot {
  const emergencyContacts: EmergencyContacts | undefined = (() => {
    if (!(sharing.emergencyContact || sharing.vetInfo)) return undefined;
    if (pet.emergencyContacts) return pet.emergencyContacts;
    try {
      const raw = uid ? localStorage.getItem(`petbase-profile-emergency-${uid}`) : null;
      return raw ? JSON.parse(raw) : undefined;
    } catch { return undefined; }
  })();
  return {
    name: pet.name, breed: pet.breed, type: pet.type, image: pet.image,
    weight: pet.weight, birthday: pet.birthday, age: pet.age,
    avatarShape: pet.avatarShape, backgroundColor: pet.backgroundColor,
    food: pet.food, foodBrand: pet.foodBrand, foodAmount: pet.foodAmount,
    foodUnit: pet.foodUnit,
    activity: sharing.personalityPlay ? pet.activity : undefined,
    likes: sharing.personalityPlay ? pet.likes : undefined,
    dislikes: sharing.personalityPlay ? pet.dislikes : undefined,
    favoriteActivities: sharing.personalityPlay ? getPetFavoriteActivities(pet) : undefined,
    typeOfPlay: sharing.personalityPlay ? getPetTypeOfPlay(pet) : undefined,
    spayedNeutered: getPetSpayedNeutered(pet),
    lastVet: sharing.vetInfo ? pet.lastVet : undefined,
    notes: sharing.medicalOverview ? pet.notes : undefined,
    vaccines: sharing.vaccineRecords ? getPetVaccines(pet) : undefined,
    medications: sharing.medications ? getPetMedications(pet) : undefined,
    emergencyContacts,
    microchipId: sharing.microchip ? (pet as any).microchipId : undefined,
    householdInfo: includeGeneralInfo && generalInfoText ? generalInfoText : undefined,
    dietaryRestrictions: sharing.diet
      ? pet.dietSchedule?.map(ds => ds.dietaryRestrictions).filter(Boolean).join('; ') || undefined
      : undefined,
  };
}

export const SHARING_FIELD_DEFS: { key: keyof SharingToggles; label: string }[] = [
  { key: 'basicInfo', label: 'Pet Description' },
  { key: 'diet', label: 'Health & Diet' },
  { key: 'emergencyContact', label: 'Emergency Contact' },
  { key: 'medicalOverview', label: 'Medical Notes' },
  { key: 'medications', label: 'Medications' },
  { key: 'microchip', label: 'Microchip ID' },
  { key: 'personalityPlay', label: 'Personality & Play' },
  { key: 'vaccineRecords', label: 'Vaccine Records' },
  { key: 'vetInfo', label: 'Vet Info' },
];
