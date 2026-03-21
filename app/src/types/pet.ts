// Central Pet type definition — imported by both PetContext and firestoreService
// to avoid circular dependencies.
//
// Per petbase-system-instructions.md: the `notes` field is PII and MUST be
// AES-256-GCM encrypted by src/lib/crypto.ts before any Firestore write.
export interface FeedingEntry {
  amount: string;   // "1"
  unit: string;     // "cup"
  time: string;     // "08:00" (24h format)
}

export interface DietSchedule {
  foodType: string;           // "Purina Pro Plan"
  entries: FeedingEntry[];    // multiple time slots
  dietaryRestrictions?: string; // e.g. "NO CHICKEN PRODUCTS"
}

export interface EmergencyContacts {
  ownerPhone?: string;
  vetInfo?: { clinic: string; name: string; address: string; phone: string };
  additionalContacts?: Array<{ name: string; phone: string }>; // Max 3
}

export interface Pet {
  id: string;
  name: string;
  type?: string; // Pet species/type (Dog, Cat, Rabbit, etc.)
  breed: string;
  age: string;
  weight: string;
  notes: string; // PII — encrypted client-side before Firestore writes
  image: string;
  // Extended profile fields
  activity?: string;
  food?: string;
  lastVet?: string;
  likes?: string[];
  dislikes?: string[];
  // New fields
  height?: string;
  length?: string;
  bodyConditionScore?: string;
  favoriteActivities?: string[];
  typeOfPlay?: string;
  dietSchedule?: DietSchedule[];
  medicalVisits?: {
    date: string;
    clinic: string;
    reason: string;
    notes: string;
  }[];
  lostStatus?: {
    isLost: boolean;
    reportedAt: number;
    description?: string;
    additionalPhotos?: string[];
  };
  avatarShape?: 'circle' | 'square' | 'squircle' | 'hexagon';
  pageLayout?: 'full-background' | 'solid-color';
  backgroundColor?: string;
  isPrivate?: boolean;
  visibility?: 'public' | 'friends' | 'private';
  gallery?: string[]; // Up to 10 photos
  spayedNeutered?: 'Yes' | 'No' | 'Unknown';
  microchipId?: string; // PII — encrypted client-side before Firestore writes
  // Phase 10 fields
  birthday?: string;           // ISO date YYYY-MM-DD; replaces free-text age
  weightUnit?: 'lbs' | 'kg';
  heightUnit?: 'inches' | 'cm';
  lengthUnit?: 'inches' | 'cm';
  foodBrand?: string;
  foodAmount?: string;
  foodUnit?: 'cups' | 'half cups' | 'oz' | 'grams' | 'lbs';
  emergencyContacts?: EmergencyContacts;
  // Phase 2: visibility field toggles
  publicFields?: string[]; // which optional fields to show publicly
  statusTags?: string[];
  ephemeralStatus?: string;          // Quick status ("At the vet", "Grooming day")
  ephemeralStatusExpiresAt?: number; // Auto-clears after this timestamp (24h from set)
  followers?: string[];              // UIDs of users following this pet
  // Phase 18: Health tracking
  weightHistory?: Array<{ date: string; weight: number }>;
  moodLog?: Array<{
    date: string;
    mood: 'happy' | 'calm' | 'energetic' | 'restless' | 'sick';
    energy: number; // 1-5
    notes?: string;
  }>;
}

/**
 * Returns true if the given field key should be visible publicly for this pet.
 * Fields in alwaysPublic are always shown. Fields in neverPublic are never shown.
 * Optional fields are shown only if included in pet.publicFields.
 */
export function isPetFieldPublic(pet: Pet, fieldKey: string): boolean {
  const alwaysPublic = ['name', 'type', 'breed', 'age', 'image'];
  // These fields must NEVER appear in publicFields regardless of what is stored
  const neverPublic = ['microchipId', 'notes', 'emergencyContacts', 'medicalVisits'];
  if (neverPublic.includes(fieldKey)) return false;
  if (alwaysPublic.includes(fieldKey)) return true;
  return (pet.publicFields ?? []).includes(fieldKey);
}
