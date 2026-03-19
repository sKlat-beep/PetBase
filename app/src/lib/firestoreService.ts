/**
 * PetBase Firestore Service
 *
 * All reads and writes for PII fields go through this module.
 * Encryption is applied BEFORE any setDoc/updateDoc call.
 * Decryption is applied IMMEDIATELY AFTER any getDoc/getDocs call,
 * before data enters React state — raw plaintext never reaches the cloud.
 *
 * PII fields encrypted:
 *   - users/{uid}/profile/data  -> address
 *   - users/{uid}/pets/{petId}  -> notes
 *
 * All PII fields (including medical records, expense data, addresses) are encrypted
 * client-side (AES-256-GCM) before any Firestore write. Multi-device sync is
 * supported via the vault subsystem (users/{uid}/vault/*).
 *
 * Firestore Security Rules (configure in Firebase Console):
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *
 *       // Helper: requester and ownerUid are in the same household
 *       function inSameHousehold(ownerUid) {
 *         let rHH = get(/databases/$(database)/documents/users/$(request.auth.uid)/profile/data).data.get('householdId', null);
 *         let oHH = get(/databases/$(database)/documents/users/$(ownerUid)/profile/data).data.get('householdId', null);
 *         return rHH != null && rHH == oHH;
 *       }
 *
 *       // Users: full access only to own subtree (covers profile, config, etc.)
 *       match /users/{userId}/{document=**} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *
 *       // Pets: own OR household co-management (read + write)
 *       match /users/{userId}/pets/{petId} {
 *         allow read, write: if request.auth != null && (
 *           request.auth.uid == userId ||
 *           inSameHousehold(userId)
 *         );
 *       }
 *
 *       // Community groups: any authenticated user can read; write rules per subcollection
 *       match /groups/{groupId} {
 *         allow read: if request.auth != null;
 *         allow create: if request.auth != null;
 *         allow update, delete: if request.auth != null &&
 *           get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role == 'Owner';
 *
 *         match /members/{userId} {
 *           allow read: if request.auth != null;
 *           // Users can join (write own membership) or Owner can update any member's role
 *           allow write: if request.auth != null && (
 *             request.auth.uid == userId ||
 *             get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role == 'Owner'
 *           );
 *         }
 *
 *         match /posts/{postId} {
 *           allow read: if request.auth != null;
 *           allow create: if request.auth != null &&
 *             exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
 *           allow update: if request.auth != null && (
 *             resource.data.authorId == request.auth.uid ||
 *             get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role in ['Owner', 'Moderator']
 *           );
 *           allow delete: if request.auth != null && (
 *             resource.data.authorId == request.auth.uid ||
 *             get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role in ['Owner', 'Moderator']
 *           );
 *
 *           match /comments/{commentId} {
 *             allow read: if request.auth != null;
 *             allow create: if request.auth != null &&
 *               exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
 *             allow delete: if request.auth != null && (
 *               resource.data.authorId == request.auth.uid ||
 *               get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role
 *                 in ['Owner', 'Moderator']
 *             );
 *             allow update: if request.auth != null;
 *           }
 *         }
 *
 *         match /events/{eventId} {
 *           allow read: if request.auth != null;
 *           allow write: if request.auth != null &&
 *             exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
 *         }
 *       }
 *
 *       // Friend requests
 *       match /friendRequests/{requestId} {
 *         allow create: if request.auth != null &&
 *           request.auth.uid == request.resource.data.fromUid;
 *         allow read: if request.auth != null && (
 *           request.auth.uid == resource.data.fromUid ||
 *           request.auth.uid == resource.data.toUid
 *         );
 *         allow update: if request.auth != null && (
 *           (request.auth.uid == resource.data.toUid && request.resource.data.status in ['accepted', 'rejected']) ||
 *           (request.auth.uid == resource.data.fromUid && request.resource.data.status == 'cancelled')
 *         );
 *         allow delete: if false;
 *       }
 *
 *       // Reports — write-only for authenticated users; read/update/delete restricted to admin SDK
 *       match /reports/{reportId} {
 *         allow create: if request.auth != null;
 *         allow read: if false;
 *         allow update, delete: if false;
 *       }
 *
 *       // Notifications — user reads/manages own; any authenticated user may create (sender writes to recipient)
 *       match /notifications/{uid}/items/{itemId} {
 *         allow read, update, delete: if request.auth != null && request.auth.uid == uid;
 *         allow create: if request.auth != null;
 *       }
 *
 *       // Households — Family Sharing
 *       match /households/{householdId} {
 *         allow read: if request.auth != null && (
 *           resource.data.ownerId == request.auth.uid ||
 *           exists(/databases/$(database)/documents/households/$(householdId)/members/$(request.auth.uid))
 *         );
 *         allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
 *         allow update: if request.auth != null && resource.data.ownerId == request.auth.uid;
 *         allow delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
 *
 *         match /members/{uid} {
 *           allow read: if request.auth != null &&
 *             exists(/databases/$(database)/documents/households/$(householdId)/members/$(request.auth.uid));
 *           // Any authenticated user can join (write own membership doc)
 *           allow create: if request.auth != null && request.auth.uid == uid;
 *           // Only owner can kick (delete others); anyone can delete own doc (leave)
 *           allow delete: if request.auth != null && (
 *             request.auth.uid == uid ||
 *             get(/databases/$(database)/documents/households/$(householdId)).data.ownerId == request.auth.uid
 *           );
 *           // Owner can update roles
 *           allow update: if request.auth != null &&
 *             get(/databases/$(database)/documents/households/$(householdId)).data.ownerId == request.auth.uid;
 *         }
 *       }
 *
 *       // Direct messages — thread document and message subcollection
 *       // threadId is always "lowerUid_higherUid" (two UIDs sorted and joined with '_')
 *       match /messages/{threadId} {
 *         // Thread document: only the two participants may read or write
 *         allow read, write: if request.auth != null && (
 *           threadId.matches('^' + request.auth.uid + '_.*') ||
 *           threadId.matches('.*_' + request.auth.uid + '$')
 *         );
 *
 *         match /{messageId} {
 *           // Read: auth user must be one of the two participants in the thread
 *           allow read: if request.auth != null && (
 *             threadId.matches('^' + request.auth.uid + '_.*') ||
 *             threadId.matches('.*_' + request.auth.uid + '$')
 *           );
 *           // Create: sender must be the authenticated user
 *           allow create: if request.auth != null &&
 *             request.auth.uid == request.resource.data.fromUid && (
 *               threadId.matches('^' + request.auth.uid + '_.*') ||
 *               threadId.matches('.*_' + request.auth.uid + '$')
 *             );
 *           // Update: limited to read receipts and reactions (no content edits)
 *           allow update: if request.auth != null && (
 *             threadId.matches('^' + request.auth.uid + '_.*') ||
 *             threadId.matches('.*_' + request.auth.uid + '$')
 *           ) && !('content' in request.resource.data.diff(resource.data));
 *           allow delete: if false;
 *         }
 *       }
 *     }
 *   }
 *
 * messages/{threadId}/{messageId} — TTL on expiresAt field (3-year retention)
 *   - Firestore TTL policy must be set via Firebase Console on the expiresAt field
 */

import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, collectionGroup, updateDoc, query, where, limit, addDoc, onSnapshot, orderBy, startAfter, type DocumentSnapshot, type Unsubscribe, writeBatch, arrayUnion, arrayRemove, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

/** Convert Firestore Timestamp fields (createdAt, updatedAt, expiresAt) to epoch ms numbers. */
function coerceTimestamps<T>(data: Record<string, unknown>): T {
  for (const key of ['createdAt', 'updatedAt', 'expiresAt', 'revokedAt', 'lastSeen', 'editedAt'] as const) {
    const v = data[key];
    if (v instanceof Timestamp) {
      data[key] = v.toMillis();
    }
  }
  return data as T;
}
import { getOrCreateUserKey, encryptField, decryptField, type VaultKeyDoc } from './crypto';
import type { Pet, EmergencyContacts } from '../types/pet';
import type { UserProfile, PublicStatus, AppNotification } from '../types/user';
import type { Household, HouseholdMember, HouseholdRole, MemberPermissions, ParentalControls, AuditEntry } from '../types/household';
import { DEFAULT_PERMISSIONS, DEFAULT_PARENTAL_CONTROLS } from '../types/household';

export interface PublicProfileInfo {
  uid: string;
  displayName: string;
  username?: string;
  avatarUrl: string; // Exposed for secure resolution via tokenService
  visibility: 'Public' | 'Friends Only' | 'Private';
  publicStatus: PublicStatus;
  friends?: string[]; // UIDs of this user's friends — used for mutual-friends PYMK scoring
}

// --- User Profile -----------------------------------------------------------

export async function saveUserProfile(
  uid: string,
  profile: UserProfile & { householdId?: string | null }
): Promise<void> {
  const key = await getOrCreateUserKey(uid);
  const encAddress = await encryptField(profile.address, key);
  const encZipCode = await encryptField(profile.zipCode ?? '', key);
  const payload: Record<string, unknown> = {
    displayName: profile.displayName,
    username: profile.username,
    address: encAddress,
    zipCode: encZipCode,
    visibility: profile.visibility,
    publicStatus: profile.publicStatus ?? 'None',
    avatarUrl: profile.avatarUrl ?? '',
    avatarShape: profile.avatarShape ?? 'circle',
    updatedAt: new Date().toISOString(),
  };
  if (profile.householdId !== undefined) payload.householdId = profile.householdId;
  await setDoc(doc(db, 'users', uid, 'profile', 'data'), payload, { merge: true });
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
  if (!snap.exists()) return null;
  const data = snap.data();
  const key = await getOrCreateUserKey(uid);
  return {
    displayName: data.displayName ?? '',
    username: data.username,
    address: await decryptField(data.address ?? '', key),
    zipCode: await decryptField(data.zipCode ?? '', key),
    visibility: data.visibility ?? 'Public',
    publicStatus: data.publicStatus ?? 'None',
    blockedUsers: data.blockedUsers ?? [],
    lostPetOptOut: data.lostPetOptOut ?? false,
    friends: data.friends ?? [],
    avatarUrl: data.avatarUrl ?? '',
    avatarShape: data.avatarShape ?? 'circle',
    householdId: data.householdId ?? null,
  } as UserProfile & { householdId: string | null };
}

export async function searchPublicProfiles(searchQuery: string): Promise<PublicProfileInfo[]> {
  // Collection group query to bypass needing an index for basic text search.
  // It reads all profiles, which is acceptable for a prototype without specialized search infra.
  const snap = await getDocs(collectionGroup(db, 'profile'));
  const results: PublicProfileInfo[] = [];
  const q = searchQuery.toLowerCase();

  snap.forEach(d => {
    // collectionGroup('profile') returns documents typically named 'data'
    // The user's UID is the parent document of the profile subcollection.
    const uid = d.ref.parent.parent?.id;
    if (!uid) return;

    const data = d.data();
    if (data.visibility === 'Private') return;

    if (
      (data.displayName && data.displayName.toLowerCase().includes(q)) ||
      (data.username && data.username.toLowerCase().includes(q))
    ) {
      results.push({
        uid,
        displayName: data.displayName,
        username: data.username,
        avatarUrl: data.avatarUrl || '',
        visibility: data.visibility || 'Public',
        publicStatus: data.publicStatus || 'None',
        friends: Array.isArray(data.friends) ? data.friends : [],
      });
    }
  });

  return results;
}

/**
 * Fetch a single user's non-PII public profile fields by UID.
 * Does NOT decrypt address/zipCode — only reads non-sensitive fields.
 * Returns null if the document does not exist.
 */
export interface PublicProfileDetails extends PublicProfileInfo {
  disableDMs: boolean;
  disableGroupInvites: boolean;
  showLastActive: boolean;
  lastSeen?: number;
  lastActive?: number;
  badges?: Array<{ id: string; unlockedAt: number }>;
}

export async function fetchPublicProfileById(uid: string): Promise<PublicProfileDetails | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName ?? '',
    username: data.username,
    avatarUrl: data.avatarUrl ?? '',
    visibility: data.visibility ?? 'Public',
    publicStatus: data.publicStatus ?? 'None',
    disableDMs: data.disableDMs ?? false,
    disableGroupInvites: data.disableGroupInvites ?? false,
    showLastActive: data.showLastActive !== false, // default true
    lastSeen: typeof data.lastSeen === 'number' ? data.lastSeen : undefined,
    lastActive: typeof data.lastActive === 'number' ? data.lastActive : undefined,
    badges: Array.isArray(data.badges) ? data.badges : undefined,
  };
}

// --- Public Profile Pets ----------------------------------------------------

export interface PublicPetSummary {
  id: string;
  name: string;
  breed: string;
  type?: string;
  avatarShape?: string;
  image?: string;
  age?: string;
  weight?: string;
  food?: string;
  likes?: string[];
  dislikes?: string[];
  activity?: string;
  spayedNeutered?: string;
}

/** Check if a field is public for this pet based on its publicFields array. */
function isFieldPublic(data: Record<string, any>, fieldKey: string): boolean {
  const alwaysPublic = ['name', 'type', 'breed', 'age', 'image'];
  const neverPublic = ['microchipId', 'notes', 'emergencyContacts', 'medicalVisits'];
  if (neverPublic.includes(fieldKey)) return false;
  if (alwaysPublic.includes(fieldKey)) return true;
  const publicFields: string[] = Array.isArray(data.publicFields) ? data.publicFields : [];
  return publicFields.includes(fieldKey);
}

/**
 * Returns public (non-private) pets for a given user UID.
 * Only non-PII fields are returned — notes/medical records are never included.
 * Respects per-field publicFields array for optional fields.
 * Requires Firestore rule: authenticated users may read any /users/{uid}/pets/{petId}.
 */
export async function getPublicPetsForUser(uid: string): Promise<PublicPetSummary[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'pets'));
  const pets: PublicPetSummary[] = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.isPrivate) return;
    const summary: PublicPetSummary = {
      id: d.id,
      name: data.name ?? '',
      breed: data.breed ?? '',
      type: data.type,
      avatarShape: data.avatarShape,
    };
    // Always-public fields
    if (data.image) summary.image = data.image;
    if (data.age || data.birthday) summary.age = data.age ?? '';
    // Optional fields — respect publicFields
    if (isFieldPublic(data, 'weight') && data.weight) summary.weight = data.weight;
    if (isFieldPublic(data, 'food') && data.food) summary.food = data.food;
    if (isFieldPublic(data, 'likes') && data.likes?.length) summary.likes = data.likes;
    if (isFieldPublic(data, 'dislikes') && data.dislikes?.length) summary.dislikes = data.dislikes;
    if (isFieldPublic(data, 'activity') && data.activity) summary.activity = data.activity;
    if (isFieldPublic(data, 'spayedNeutered') && data.spayedNeutered && data.spayedNeutered !== 'Unknown') summary.spayedNeutered = data.spayedNeutered;
    pets.push(summary);
  });
  return pets;
}

// --- Public Pet Cards -------------------------------------------------------

export interface PublicCardPetSnapshot {
  name: string;
  breed: string;
  type?: string;
  image: string;
  weight?: string;
  birthday?: string;
  age?: string;
  avatarShape?: string;
  backgroundColor?: string;
  food?: string;
  foodBrand?: string;
  foodAmount?: string;
  foodUnit?: string;
  activity?: string;
  likes?: string[];
  dislikes?: string[];
  favoriteActivities?: string[];
  typeOfPlay?: string;
  spayedNeutered?: string;
  lastVet?: string;
  notes?: string;
  vaccines?: any[];
  medications?: any[];
  emergencyContacts?: EmergencyContacts;
  microchipId?: string;
  householdInfo?: string;
}

export interface PublicCardDoc {
  id: string;
  ownerId: string;
  petId: string;
  template: string;
  sharing: Record<string, boolean>;
  expiresAt: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: number;
  revokedAt?: number;
  petSnapshot?: PublicCardPetSnapshot; // Optional because multi-pets use multiPetConfig
  multiPetConfig?: Array<{ petId: string; sharing: Record<string, boolean>; petSnapshot: PublicCardPetSnapshot }>;
  includeGeneralInfo?: boolean;
  fieldOrder?: string[];
}

export async function savePublicCard(card: PublicCardDoc): Promise<void> {
  await setDoc(doc(db, 'publicCards', card.id), card);
}

export async function updatePublicCardStatus(cardId: string, status: 'active' | 'revoked' | 'expired'): Promise<void> {
  await updateDoc(doc(db, 'publicCards', cardId), { status });
}

export async function deletePublicCard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'publicCards', cardId));
}

export async function getPublicCard(cardId: string): Promise<PublicCardDoc | null> {
  const snap = await getDoc(doc(db, 'publicCards', cardId));
  if (!snap.exists()) return null;
  return snap.data() as PublicCardDoc;
}

/** Fetch all public cards owned by this user. Used to seed the Cards page from Firestore. */
export async function getPublicCardsForOwner(uid: string): Promise<PublicCardDoc[]> {
  const q = query(collection(db, 'publicCards'), where('ownerId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PublicCardDoc);
}

/** Update status and optionally set revokedAt timestamp. */
export async function updatePublicCardStatusWithTimestamp(
  cardId: string,
  status: 'active' | 'revoked' | 'expired',
  revokedAt?: number,
): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (revokedAt !== undefined) payload.revokedAt = revokedAt;
  else if (status === 'active') payload.revokedAt = null; // clear on undo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, 'publicCards', cardId), payload as any);
}

// --- Vault (E2EE Cross-Device Sync) -----------------------------------------

/**
 * Saves the user's wrapped AES key to Firestore.
 * The raw key is never transmitted — only the PBKDF2-wrapped ciphertext.
 * Path: users/{uid}/vault/key
 */
export async function saveVaultKey(uid: string, vaultKeyDoc: VaultKeyDoc): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'vault', 'key'), { ...vaultKeyDoc });
}

/**
 * Loads the wrapped vault key document from Firestore.
 * Returns null if no vault key has been set up yet.
 */
export async function loadVaultKey(uid: string): Promise<VaultKeyDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'vault', 'key'));
  if (!snap.exists()) return null;
  return snap.data() as VaultKeyDoc;
}

/**
 * Saves an encrypted expenses blob to Firestore vault.
 * The blob must already be encrypted by the caller — never stored as plaintext.
 * Path: users/{uid}/vault/expenses
 */
export async function saveVaultExpenses(uid: string, encryptedBlob: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'vault', 'expenses'), {
    encrypted: encryptedBlob,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Loads the encrypted expenses blob from Firestore vault.
 * Returns null if no vault expenses exist yet.
 */
export async function loadVaultExpenses(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'vault', 'expenses'));
  if (!snap.exists()) return null;
  return (snap.data().encrypted as string) ?? null;
}

// --- Pets -------------------------------------------------------------------

const medicalKey = (uid: string, petId: string) => `petbase-medical-${uid}-${petId}`;

/**
 * Saves vaccines and medicalVisits to:
 *   1. Encrypted localStorage (for fast offline reads)
 *   2. Firestore vault doc users/{uid}/vault/medical_{petId} (for cross-device sync)
 * The blob is encrypted before either write — the cloud sees only ciphertext.
 */
async function saveMedicalRecords(uid: string, petId: string, pet: Pet): Promise<void> {
  const vaccines = (pet as any).vaccines;
  const medicalVisits = (pet as any).medicalVisits;
  if (!vaccines && !medicalVisits) return;
  const key = await getOrCreateUserKey(uid);
  const payload = JSON.stringify({ vaccines: vaccines ?? [], medicalVisits: medicalVisits ?? [] });
  const encrypted = await encryptField(payload, key);
  // Write-through: localStorage (offline cache) + Firestore vault (multi-device sync)
  localStorage.setItem(medicalKey(uid, petId), encrypted);
  await setDoc(doc(db, 'users', uid, 'vault', `medical_${petId}`), {
    encrypted,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Loads medical records and merges them into the pet.
 * Priority: localStorage (fast) → Firestore vault (cross-device fallback).
 */
async function loadMedicalRecords(uid: string, pet: Pet): Promise<Pet> {
  const key = await getOrCreateUserKey(uid);
  let encrypted: string | null = localStorage.getItem(medicalKey(uid, pet.id));

  // Cross-device fallback: if not in localStorage, try Firestore vault
  if (!encrypted) {
    const snap = await getDoc(doc(db, 'users', uid, 'vault', `medical_${pet.id}`));
    if (snap.exists()) {
      encrypted = snap.data().encrypted ?? null;
      // Populate local cache so future reads are fast
      if (encrypted) localStorage.setItem(medicalKey(uid, pet.id), encrypted);
    }
  }

  if (!encrypted) return pet;
  const decrypted = await decryptField(encrypted, key);
  if (!decrypted) return pet;
  try {
    const { vaccines, medicalVisits } = JSON.parse(decrypted);
    return { ...pet, ...(vaccines ? { vaccines } : {}), ...(medicalVisits ? { medicalVisits } : {}) } as Pet;
  } catch {
    return pet;
  }
}

export async function savePet(uid: string, pet: Pet): Promise<void> {
  const key = await getOrCreateUserKey(uid);
  const encNotes = await encryptField(pet.notes, key);

  // Save medical records encrypted to localStorage cache + Firestore vault
  await saveMedicalRecords(uid, pet.id, pet);

  // Strip PII-adjacent fields before Firestore write
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { vaccines, medicalVisits, ...petForFirestore } = pet as any;
  await setDoc(doc(db, 'users', uid, 'pets', pet.id), {
    ...petForFirestore,
    notes: encNotes,
  });
}

export async function loadPets(uid: string): Promise<Pet[]> {
  const key = await getOrCreateUserKey(uid);
  const snap = await getDocs(collection(db, 'users', uid, 'pets'));
  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as Pet;
      const withNotes: Pet = {
        ...data,
        notes: await decryptField(data.notes ?? '', key),
      };
      // Merge in encrypted local medical records
      return loadMedicalRecords(uid, withNotes);
    })
  );
}

export async function deletePetDoc(uid: string, petId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'pets', petId));
}

/**
 * Deletes all publicCards documents owned by this user for a given pet.
 * Called as part of full pet deletion to remove shared card links.
 */
export async function deletePublicCardsForPet(uid: string, petId: string): Promise<void> {
  const q = query(collection(db, 'publicCards'), where('ownerId', '==', uid), where('petId', '==', petId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// --- Household / Family Sharing --------------------------------------------

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createHousehold(
  uid: string,
  displayName: string,
  householdName: string,
): Promise<Household> {
  const key = await getOrCreateUserKey(uid);
  const encHouseholdName = await encryptField(householdName, key);
  const encDisplayName = await encryptField(displayName, key);

  const householdId = crypto.randomUUID();
  const inviteCode = generateInviteCode();
  const now = Date.now();
  const household: Household = { id: householdId, name: householdName, namePublic: householdName, ownerId: uid, inviteCode, createdAt: now };

  const leaderPermissions: MemberPermissions = { editPetInfo: true, addMedicalInfo: true, createRevokePetCards: true };
  await setDoc(doc(db, 'households', householdId), { name: encHouseholdName, namePublic: householdName, ownerId: uid, inviteCode, createdAt: now });
  await setDoc(doc(db, 'households', householdId, 'members', uid), { uid, displayName: encDisplayName, displayNamePublic: displayName, role: 'Family Leader', joinedAt: now, permissions: leaderPermissions });
  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), { householdId });

  return household;
}

export async function joinHouseholdByCode(
  uid: string,
  displayName: string,
  code: string,
): Promise<Household> {
  // Use Cloud Function to resolve invite code (bypasses Firestore rules)
  const resolve = httpsCallable<{ code: string }, { householdId: string; name: string; ownerId: string }>(functions, 'resolveInviteCode');
  const result = await resolve({ code: code.toUpperCase().trim() });
  const { householdId, name, ownerId } = result.data;

  const key = await getOrCreateUserKey(uid);
  const encDisplayName = await encryptField(displayName, key);

  await setDoc(doc(db, 'households', householdId, 'members', uid), { uid, displayName: encDisplayName, displayNamePublic: displayName, role: 'Member', joinedAt: Date.now(), permissions: DEFAULT_PERMISSIONS });
  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), { householdId });

  const household: Household = { id: householdId, name, namePublic: name, ownerId, inviteCode: code.toUpperCase().trim(), createdAt: 0 };
  return household;
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return null;
  const data = snap.data();

  const household: Household = { id: snap.id, ...data } as Household;

  // Use plaintext public name for all members; decrypt for owner as fallback
  if (data.namePublic) {
    household.name = data.namePublic;
  } else {
    const currentUser = auth.currentUser;
    if (currentUser && data.ownerId === currentUser.uid && data.name?.startsWith('ENC:')) {
      try {
        const key = await getOrCreateUserKey(currentUser.uid);
        household.name = await decryptField(data.name, key);
      } catch (err) {
        console.error('Failed to decrypt household name:', err);
      }
    }
  }

  return household;
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const snap = await getDocs(collection(db, 'households', householdId, 'members'));
  const currentUser = auth.currentUser;

  return Promise.all(snap.docs.map(async d => {
    const data = d.data();
    let displayName = data.displayNamePublic || data.displayName;

    // Decrypt own name; use plaintext public name for others
    if (currentUser && data.uid === currentUser.uid && data.displayName?.startsWith('ENC:')) {
      try {
        const key = await getOrCreateUserKey(currentUser.uid);
        displayName = await decryptField(data.displayName, key);
      } catch (err) {
        console.error('Failed to decrypt member display name:', err);
      }
    }

    return { ...data, displayName, displayNamePublic: data.displayNamePublic ?? displayName } as HouseholdMember;
  }));
}

export function subscribeToHouseholdMembers(
  householdId: string,
  callback: (members: HouseholdMember[]) => void,
): () => void {
  return onSnapshot(collection(db, 'households', householdId, 'members'), async snap => {
    const currentUser = auth.currentUser;
    const members = await Promise.all(snap.docs.map(async d => {
      const data = d.data();
      let displayName = data.displayNamePublic || data.displayName;
      if (currentUser && data.uid === currentUser.uid && data.displayName?.startsWith('ENC:')) {
        try {
          const key = await getOrCreateUserKey(currentUser.uid);
          displayName = await decryptField(data.displayName, key);
        } catch { /* fallback to public name */ }
      }
      return { ...data, displayName, displayNamePublic: data.displayNamePublic ?? displayName } as HouseholdMember;
    }));
    callback(members);
  });
}

export async function leaveHousehold(householdId: string, uid: string, isOwner: boolean, memberCount: number): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'members', uid));
  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), { householdId: null });
  if (isOwner && memberCount <= 1) {
    await deleteDoc(doc(db, 'households', householdId));
  } else if (isOwner && memberCount > 1) {
    // Transfer ownership to longest-tenured remaining member
    const membersSnap = await getDocs(collection(db, 'households', householdId, 'members'));
    const remaining = membersSnap.docs
      .map(d => d.data())
      .filter(m => m.uid !== uid)
      .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
    if (remaining.length > 0) {
      const newOwner = remaining[0];
      await updateDoc(doc(db, 'households', householdId), { ownerId: newOwner.uid });
      await updateDoc(doc(db, 'households', householdId, 'members', newOwner.uid), { role: 'Family Leader' });
    }
  }
}

export async function kickHouseholdMember(householdId: string, memberUid: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'members', memberUid));
  await updateDoc(doc(db, 'users', memberUid, 'profile', 'data'), { householdId: null });
}

export async function clearStaleHouseholdId(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), { householdId: null });
}

export async function renameHousehold(householdId: string, ownerUid: string, newName: string): Promise<void> {
  const key = await getOrCreateUserKey(ownerUid);
  const encName = await encryptField(newName, key);
  await updateDoc(doc(db, 'households', householdId), { name: encName, namePublic: newName });
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  const newCode = generateInviteCode();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7-day expiry
  await updateDoc(doc(db, 'households', householdId), { inviteCode: newCode, inviteCodeExpiresAt: expiresAt });
  return newCode;
}

export async function updateMemberRole(householdId: string, uid: string, role: HouseholdRole): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'members', uid), { role });
}

export async function updateMemberPermissions(householdId: string, uid: string, permissions: MemberPermissions): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'members', uid), { permissions });
}

export async function updateParentalControls(householdId: string, uid: string, controls: ParentalControls): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'members', uid), { parentalControls: controls });
}

export async function addAuditEntry(householdId: string, entry: Omit<AuditEntry, 'id'>): Promise<AuditEntry> {
  const ref = await addDoc(collection(db, 'households', householdId, 'auditLog'), entry);
  return { ...entry, id: ref.id };
}

export async function getAuditLog(householdId: string): Promise<AuditEntry[]> {
  const snap = await getDocs(collection(db, 'households', householdId, 'auditLog'));
  return snap.docs
    .map(d => coerceTimestamps<AuditEntry>({ id: d.id, ...d.data() }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** Ensures the current user has a household (creates one if not), then returns its invite code. */
export async function ensureHouseholdForFamily(
  uid: string,
  displayName: string,
): Promise<Household> {
  const profileSnap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
  const existingId = profileSnap.exists() ? profileSnap.data().householdId : null;
  if (existingId) {
    const hh = await getHousehold(existingId);
    if (hh) return hh;
  }
  return createHousehold(uid, displayName, `${displayName}'s Family`);
}

// --- Direct Messages (DMs) ---------------------------------------------------

export interface DmMessage {
  id: string;
  fromUid: string;
  toUid: string;
  threadId: string;        // sorted [fromUid, toUid].join('_')
  participants: string[];  // sorted [fromUid, toUid] — for array-contains query
  content: string;
  createdAt: number;
  read: boolean;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  expiresAt: number;       // createdAt + 3 years (ms) — TTL field, policy set in Firebase Console
  reactions?: {
    paw: string[];
    bone: string[];
    heart: string[];
  };
  mediaUrl?: string;       // URL for image or GIF
  mediaType?: 'image' | 'gif' | 'audio'; // type of attached media
  replyToId?: string;
  replyToContent?: string;     // first 100 chars
  replyToFromUid?: string;
  linkPreview?: {
    title: string;
    description: string;
    image: string;
    siteName: string;
    url: string;
  };
  editedAt?: number;
  originalContent?: string;
}

function buildThreadId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function sendDm(
  fromUid: string,
  toUid: string,
  content: string,
  media?: { url: string; type: 'image' | 'gif' | 'audio' },
  replyTo?: { id: string; content: string; fromUid: string },
): Promise<string> {
  const now = Date.now();
  const participants = [fromUid, toUid].sort();
  const payload: Record<string, unknown> = {
    fromUid,
    toUid,
    threadId: buildThreadId(fromUid, toUid),
    participants,
    content,
    createdAt: now,
    read: false,
    deletedBySender: false,
    deletedByRecipient: false,
    expiresAt: now + 3 * 365 * 24 * 60 * 60 * 1000,
  };
  if (replyTo) {
    payload.replyToId = replyTo.id;
    payload.replyToContent = replyTo.content.slice(0, 100);
    payload.replyToFromUid = replyTo.fromUid;
  }
  if (media) {
    payload.mediaUrl = media.url;
    payload.mediaType = media.type;
  }
  const ref = await addDoc(collection(db, 'messages'), payload);
  return ref.id;
}

export async function markDmRead(messageId: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), { read: true });
}

export async function editDmMessage(
  messageId: string,
  callerUid: string,
  newContent: string,
): Promise<void> {
  const ref = doc(db, 'messages', messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Message not found');
  const data = snap.data();
  if (data.fromUid !== callerUid) throw new Error('Not your message');
  const ageMs = Date.now() - (data.createdAt ?? 0);
  if (ageMs > 15 * 60 * 1000) throw new Error('Edit window expired');
  const updates: Record<string, string | number> = {
    content: newContent,
    editedAt: Date.now(),
  };
  // Save original content only on first edit
  if (!data.originalContent) {
    updates.originalContent = data.content;
  }
  await updateDoc(ref, updates);
}

export async function deleteDmForUser(messageId: string, callerUid: string, fromUid: string): Promise<void> {
  const field = fromUid === callerUid ? 'deletedBySender' : 'deletedByRecipient';
  await updateDoc(doc(db, 'messages', messageId), { [field]: true });
}

/**
 * Real-time subscription to all conversations for a user.
 * Groups by threadId; returns the most recent message per thread.
 */
export function subscribeToConversations(
  uid: string,
  onData: (convos: { threadId: string; otherUid: string; lastMessage: DmMessage }[]) => void,
  onError: () => void,
): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    where('participants', 'array-contains', uid),
    orderBy('createdAt', 'desc'),
    limit(500),
  );
  return onSnapshot(q, snap => {
    const seen = new Map<string, DmMessage>();
    snap.docs.forEach(d => {
      const m = coerceTimestamps<DmMessage>({ id: d.id, ...d.data() });
      if (m.fromUid === uid && m.deletedBySender) return;
      if (m.toUid === uid && m.deletedByRecipient) return;
      if (!seen.has(m.threadId)) seen.set(m.threadId, m);
    });
    const convos = Array.from(seen.entries()).map(([threadId, lastMessage]) => ({
      threadId,
      otherUid: lastMessage.fromUid === uid ? lastMessage.toUid : lastMessage.fromUid,
      lastMessage,
    }));
    onData(convos);
  }, onError);
}

/**
 * Real-time subscription to a specific message thread.
 */
export function subscribeToThread(
  uid: string,
  otherUid: string,
  onData: (messages: DmMessage[]) => void,
  onError: () => void,
): Unsubscribe {
  const threadId = buildThreadId(uid, otherUid);
  const q = query(
    collection(db, 'messages'),
    where('threadId', '==', threadId),
    orderBy('createdAt', 'asc'),
    limit(200),
  );
  return onSnapshot(q, snap => {
    const messages = snap.docs
      .map(d => coerceTimestamps<DmMessage>({ id: d.id, ...d.data() }))
      .filter(m => !(m.fromUid === uid && m.deletedBySender) && !(m.toUid === uid && m.deletedByRecipient));
    onData(messages);
  }, onError);
}

/**
 * Write typing indicator for uid in a thread.
 * Path: dmTyping/{threadId}/users/{uid}
 *
 * Security rules (add to Firestore console):
 *   match /dmTyping/{threadId}/users/{uid} {
 *     // Only the two participants may read/write.
 *     // threadId is always "lowerUid_higherUid" (sorted), so we anchor the match:
 *     //   - auth.uid is the left participant:  threadId starts with auth.uid + '_'
 *     //   - auth.uid is the right participant: threadId ends with '_' + auth.uid
 *     // This avoids the unreliable unbounded substring match ('.*uid.*').
 *     allow read, write: if request.auth != null && (
 *       threadId.matches('^' + request.auth.uid + '_.*') ||
 *       threadId.matches('.*_' + request.auth.uid + '$')
 *     );
 *   }
 */
export async function setTyping(threadId: string, uid: string, isTyping: boolean): Promise<void> {
  await setDoc(
    doc(db, 'dmTyping', threadId, 'users', uid),
    { isTyping, updatedAt: serverTimestamp() },
  );
}

/**
 * Subscribe to the typing indicator for otherUid in a thread.
 * Path: dmTyping/{threadId}/users/{otherUid}
 * Returns unsubscribe fn.
 */
export function subscribeTyping(
  threadId: string,
  otherUid: string,
  callback: (isTyping: boolean) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'dmTyping', threadId, 'users', otherUid),
    snap => {
      callback(snap.exists() ? (snap.data()?.isTyping ?? false) : false);
    },
    () => callback(false),
  );
}

/**
 * Toggle a reaction on a DM message (same pattern as reactToGroupComment).
 * The reactions field on DmMessage: { paw: string[], bone: string[], heart: string[] }
 */
export async function reactToDm(
  threadId: string,
  messageId: string,
  uid: string,
  reaction: 'paw' | 'bone' | 'heart',
  alreadyReacted: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), {
    [`reactions.${reaction}`]: alreadyReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
}

// --- Group Posts Pagination --------------------------------------------------

export async function getGroupPostsPaginated(
  groupId: string,
  pageSize = 20,
  startAfterDoc?: DocumentSnapshot,
): Promise<{
  posts: Array<Record<string, unknown> & { id: string }>;
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  let q = query(
    collection(db, 'groups', groupId, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }
  const snap = await getDocs(q);
  return {
    posts: snap.docs.map(d => coerceTimestamps<Record<string, unknown> & { id: string }>({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}

// --- Group Comments ---------------------------------------------------------

export interface GroupComment {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  content: string;
  createdAt: number;
  parentCommentId?: string;
  isFlagged?: boolean;
  flagCount?: number;
  reactions?: {
    paw: string[];
    bone: string[];
    heart: string[];
  };
}

export async function saveGroupComment(
  groupId: string,
  postId: string,
  comment: Omit<GroupComment, 'id'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'groups', groupId, 'posts', postId, 'comments'),
    comment,
  );
  return ref.id;
}

export async function deleteGroupComment(
  groupId: string,
  postId: string,
  commentId: string,
): Promise<void> {
  const batch = writeBatch(db);

  // Delete the comment itself
  batch.delete(doc(db, 'groups', groupId, 'posts', postId, 'comments', commentId));

  // Delete all replies (documents with parentCommentId === commentId)
  const repliesSnap = await getDocs(
    query(
      collection(db, 'groups', groupId, 'posts', postId, 'comments'),
      where('parentCommentId', '==', commentId),
    ),
  );
  repliesSnap.docs.forEach(d => batch.delete(d.ref));

  await batch.commit();
}

export function subscribePostComments(
  groupId: string,
  postId: string,
  callback: (comments: GroupComment[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    snap => {
      callback(snap.docs.map(d => coerceTimestamps<GroupComment>({ id: d.id, ...d.data() })));
    },
    onError,
  );
}

export async function reactToGroupComment(
  groupId: string,
  postId: string,
  commentId: string,
  uid: string,
  reaction: 'paw' | 'bone' | 'heart',
  alreadyReacted: boolean,
): Promise<void> {
  const ref = doc(db, 'groups', groupId, 'posts', postId, 'comments', commentId);
  await updateDoc(ref, {
    [`reactions.${reaction}`]: alreadyReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
}

// --- Friend Requests --------------------------------------------------------

export interface FriendRequestDoc {
  id: string;
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export async function sendFriendRequest(fromUid: string, toUid: string): Promise<string> {
  // Check for existing pending request before creating
  const existing = await getDocs(query(
    collection(db, 'friendRequests'),
    where('fromUid', '==', fromUid),
    where('toUid', '==', toUid),
    where('status', '==', 'pending'),
    limit(1)
  ));
  if (!existing.empty) return existing.docs[0].id; // Already pending — do nothing

  const ref = await addDoc(collection(db, 'friendRequests'), {
    fromUid,
    toUid,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function acceptFriendRequest(requestId: string, fromUid: string, toUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'friendRequests', requestId), { status: 'accepted', updatedAt: Date.now() });
  batch.update(doc(db, 'users', fromUid, 'profile', 'data'), { friends: arrayUnion(toUid) });
  batch.update(doc(db, 'users', toUid, 'profile', 'data'), { friends: arrayUnion(fromUid) });
  await batch.commit();
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected', updatedAt: Date.now() });
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'cancelled', updatedAt: Date.now() });
}

export async function removeFriend(fromUid: string, toUid: string): Promise<void> {
  const batch = writeBatch(db);
  const fromRef = doc(db, 'users', fromUid, 'profile', 'data');
  const toRef = doc(db, 'users', toUid, 'profile', 'data');
  batch.update(fromRef, { friends: arrayRemove(toUid) });
  batch.update(toRef, { friends: arrayRemove(fromUid) });
  await batch.commit();
}

/**
 * Subscribes to all friend requests involving the given UID.
 * Uses two onSnapshot subscriptions (fromUid and toUid) and merges results,
 * since Firestore SDK v9 does not support OR queries across different fields.
 * Returns a single cleanup function that unsubscribes both listeners.
 */
export function subscribeFriendRequests(
  uid: string,
  callback: (requests: FriendRequestDoc[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const sentMap = new Map<string, FriendRequestDoc>();
  const receivedMap = new Map<string, FriendRequestDoc>();

  function emit() {
    const merged = new Map<string, FriendRequestDoc>([...sentMap, ...receivedMap]);
    callback(Array.from(merged.values()));
  }

  const sentUnsub = onSnapshot(
    query(collection(db, 'friendRequests'), where('fromUid', '==', uid)),
    snap => {
      sentMap.clear();
      snap.docs.forEach(d => sentMap.set(d.id, coerceTimestamps<FriendRequestDoc>({ id: d.id, ...d.data() })));
      emit();
    },
    onError,
  );

  const receivedUnsub = onSnapshot(
    query(collection(db, 'friendRequests'), where('toUid', '==', uid)),
    snap => {
      receivedMap.clear();
      snap.docs.forEach(d => receivedMap.set(d.id, coerceTimestamps<FriendRequestDoc>({ id: d.id, ...d.data() })));
      emit();
    },
    onError,
  );

  return () => {
    sentUnsub();
    receivedUnsub();
  };
}

// --- Event Posts ------------------------------------------------------------
//
// Firestore path: groups/{groupId}/events/{eventId}/posts/{postId}
//
// Security Rules (add inside match /events/{eventId} block):
//
//   match /posts/{postId} {
//     allow read: if request.auth != null;
//     // NOTE: Attendance gate (attendeeIds check) is enforced client-side only in CommunityContext.
//     // A full server-side gate requires a Cloud Function onCall wrapper (TODO: Phase 5+).
//     // For now, any group member can write an event post if they bypass the client.
//     allow create: if request.auth != null &&
//       exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
//     allow delete: if request.auth != null && (
//       resource.data.authorId == request.auth.uid ||
//       get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role
//         in ['Owner', 'Moderator']
//     );
//     allow update: if request.auth != null &&
//       exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
//   }

export interface EventPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
  expiresAt: number;
  reactions?: {
    paw: string[];
    bone: string[];
    heart: string[];
  };
}

export async function createEventPost(
  groupId: string,
  eventId: string,
  authorId: string,
  authorName: string,
  content: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(
    collection(db, 'groups', groupId, 'events', eventId, 'posts'),
    {
      authorId,
      authorName,
      content,
      createdAt: now,
      expiresAt: now + 3 * 365 * 24 * 60 * 60 * 1000,
      reactions: { paw: [], bone: [], heart: [] },
    },
  );
  return ref.id;
}

export async function deleteEventPost(
  groupId: string,
  eventId: string,
  postId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'events', eventId, 'posts', postId));
}

export async function reactToEventPost(
  groupId: string,
  eventId: string,
  postId: string,
  uid: string,
  reaction: 'paw' | 'bone' | 'heart',
  alreadyReacted: boolean,
): Promise<void> {
  const ref = doc(db, 'groups', groupId, 'events', eventId, 'posts', postId);
  await updateDoc(ref, {
    [`reactions.${reaction}`]: alreadyReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export function subscribeEventPosts(
  groupId: string,
  eventId: string,
  callback: (posts: EventPost[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'events', eventId, 'posts'),
    orderBy('createdAt', 'asc'),
    limit(200),
  );
  return onSnapshot(
    q,
    snap => {
      callback(snap.docs.map(d => coerceTimestamps<EventPost>({ id: d.id, ...d.data() })));
    },
    onError,
  );
}

// --- Notifications -----------------------------------------------------------

/**
 * Write a new notification to notifications/{uid}/items/{auto-id}.
 * Returns the new document ID.
 */
export async function createNotification(
  uid: string,
  notification: Omit<AppNotification, 'id'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'notifications', uid, 'items'),
    notification,
  );
  return ref.id;
}

/**
 * Subscribe to notifications/{uid}/items ordered by createdAt desc, limit 50.
 */
export function subscribeNotifications(
  uid: string,
  callback: (notifs: AppNotification[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    snap => {
      callback(snap.docs.map(d => coerceTimestamps<AppNotification>({ id: d.id, ...d.data() })));
    },
    onError,
  );
}

/** Mark a single notification as read. */
export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', uid, 'items', notifId), { read: true });
}

/**
 * Batch-update all unread notifications to read: true.
 */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications', uid, 'items'),
      where('read', '==', false)
    )
  );
  if (snap.empty) return;

  // Firestore batch limit is 500 — process in chunks
  const CHUNK_SIZE = 499;
  const chunks: typeof snap.docs[] = [];
  for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
    chunks.push(snap.docs.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(chunks.map(chunk => {
    const batch = writeBatch(db);
    chunk.forEach(d => batch.update(d.ref, { read: true }));
    return batch.commit();
  }));
}

/** Delete a single notification. */
export async function deleteNotification(uid: string, notifId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', uid, 'items', notifId));
}

// --- Pet Photo Albums --------------------------------------------------------

export interface PhotoEntry {
  url: string;
  uploadedAt: number;
  petId?: string;
}

export function photoEntryUrl(entry: PhotoEntry | string): string {
  return typeof entry === 'string' ? entry : entry.url;
}

export interface PetAlbum {
  id: string;
  name: string;
  photos: (PhotoEntry | string)[];
  coverPhoto?: string;
  visibility: 'public' | 'friends' | 'private';
  createdAt: number;
}

/** Creates a new album under users/{uid}/pets/{petId}/albums. Returns the new albumId. */
export async function createPetAlbum(
  uid: string,
  petId: string,
  album: Omit<PetAlbum, 'id'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'users', uid, 'pets', petId, 'albums'),
    album,
  );
  return ref.id;
}

/** Updates mutable album fields (name, photos, coverPhoto, visibility). */
export async function updatePetAlbum(
  uid: string,
  petId: string,
  albumId: string,
  updates: Partial<Omit<PetAlbum, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(
    doc(db, 'users', uid, 'pets', petId, 'albums', albumId),
    { ...updates },
  );
}

/** Deletes an album document. */
export async function deletePetAlbum(
  uid: string,
  petId: string,
  albumId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'pets', petId, 'albums', albumId));
}

export async function addPhotosToAlbum(
  uid: string,
  petId: string,
  albumId: string,
  entries: PhotoEntry[],
): Promise<void> {
  const albumRef = doc(db, 'users', uid, 'pets', petId, 'albums', albumId);
  const snap = await getDoc(albumRef);
  if (!snap.exists()) return;
  const existing = (snap.data().photos ?? []) as (PhotoEntry | string)[];
  const existingUrls = new Set(existing.map(p => (typeof p === 'string' ? p : p.url)));
  const newEntries = entries.filter(e => !existingUrls.has(e.url));
  if (newEntries.length === 0) return;
  await updateDoc(albumRef, { photos: arrayUnion(...newEntries) });
}

export async function removePhotoFromAlbum(
  uid: string,
  petId: string,
  albumId: string,
  entry: PhotoEntry | string,
): Promise<void> {
  const albumRef = doc(db, 'users', uid, 'pets', petId, 'albums', albumId);
  const targetUrl = typeof entry === 'string' ? entry : entry.url;

  // Read current photos to find the exact stored value (handles legacy string[] and PhotoEntry[])
  const snap = await getDoc(albumRef);
  if (!snap.exists()) return;
  const photos = (snap.data().photos ?? []) as (PhotoEntry | string)[];
  const storedEntry = photos.find(p =>
    (typeof p === 'string' ? p : p.url) === targetUrl
  );
  if (storedEntry === undefined) return; // Already removed

  await updateDoc(albumRef, { photos: arrayRemove(storedEntry) });
}

/** Real-time subscription to all albums for a pet, ordered by createdAt desc. */
export function subscribePetAlbums(
  uid: string,
  petId: string,
  onData: (albums: PetAlbum[]) => void,
  onError: () => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'pets', petId, 'albums'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    snap => {
      const albums = snap.docs.map(d => coerceTimestamps<PetAlbum>({ id: d.id, ...d.data() }));
      onData(albums);
    },
    onError,
  );
}

// --- User Default Album (photos not tied to a specific pet) ---------------

export interface UserDefaultAlbum {
  photos: PhotoEntry[];
  updatedAt: number;
}

const USER_DEFAULT_ALBUM_PATH = (uid: string) =>
  doc(db, 'users', uid, 'albums', 'default');

/** Returns current user default album, or empty shell if none. */
export async function getUserDefaultAlbum(uid: string): Promise<UserDefaultAlbum> {
  const snap = await getDoc(USER_DEFAULT_ALBUM_PATH(uid));
  if (!snap.exists()) return { photos: [], updatedAt: 0 };
  return snap.data() as UserDefaultAlbum;
}

/** Adds photos to the user default album. */
export async function addPhotosToUserDefaultAlbum(uid: string, entries: PhotoEntry[]): Promise<void> {
  const ref = USER_DEFAULT_ALBUM_PATH(uid);
  await setDoc(ref, {
    photos: arrayUnion(...entries),
    updatedAt: Date.now(),
  }, { merge: true });
}

/** Removes a photo from the user default album. */
export async function removePhotoFromUserDefaultAlbum(uid: string, entry: PhotoEntry): Promise<void> {
  const ref = USER_DEFAULT_ALBUM_PATH(uid);
  await updateDoc(ref, {
    photos: arrayRemove(entry),
    updatedAt: Date.now(),
  });
}

/** Real-time subscription to user default album. */
export function subscribeUserDefaultAlbum(
  uid: string,
  onData: (album: UserDefaultAlbum) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    USER_DEFAULT_ALBUM_PATH(uid),
    snap => {
      onData(snap.exists() ? (snap.data() as UserDefaultAlbum) : { photos: [], updatedAt: 0 });
    },
    onError,
  );
}

// --- User Albums -------------------------------------------------------------

export interface UserAlbum {
  id: string;
  name: string;
  photoUrls: string[];
  coverPhoto?: string;
  visibility: 'private' | 'public' | 'groups';
  visibleToGroupIds?: string[];
  createdAt: number;
}

export async function createUserAlbum(uid: string, album: Omit<UserAlbum, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'albums'), album);
  return ref.id;
}

export async function updateUserAlbum(
  uid: string, albumId: string, updates: Partial<Omit<UserAlbum, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'albums', albumId), { ...updates });
}

export async function deleteUserAlbum(uid: string, albumId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'albums', albumId));
}

export function subscribeUserAlbums(
  uid: string,
  onData: (albums: UserAlbum[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'users', uid, 'albums'), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    snap => onData(snap.docs.map(d => coerceTimestamps<UserAlbum>({ id: d.id, ...d.data() }))),
    onError
  );
}

// --- Presence ----------------------------------------------------------------

// In-memory throttle: track the last time we wrote lastActive per uid.
const _lastActiveWritten: Record<string, number> = {};
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Write lastActive to Firestore at most once per 5 minutes per uid.
 * Call this on meaningful user actions (page focus, sending a message, etc.).
 */
export async function updateLastActive(uid: string): Promise<void> {
  const now = Date.now();
  if (_lastActiveWritten[uid] && now - _lastActiveWritten[uid] < LAST_ACTIVE_THROTTLE_MS) return;
  _lastActiveWritten[uid] = now;
  await setDoc(
    doc(db, 'users', uid, 'profile', 'data'),
    { lastActive: now },
    { merge: true }
  );
}

export async function touchLastSeen(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), {
    lastSeen: serverTimestamp(),
  });
}

export async function updateLastSeen(uid: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'profile', 'data'),
    { lastSeen: Date.now() },
    { merge: true }
  );
}

export function formatLastSeen(lastSeen: number | undefined): string {
  if (!lastSeen) return '';
  const diff = Date.now() - lastSeen;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 5) return 'Active now';
  if (mins < 60) return `Active ${mins}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days === 1) return 'Active yesterday';
  return `Active ${days} days ago`;
}

// --- Conversation management -------------------------------------------------

export async function deleteConversation(
  uid: string,
  otherUid: string,
  messages: DmMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const threadId = [uid, otherUid].sort().join('_');
  const batch = writeBatch(db);
  messages.forEach(m => {
    batch.update(
      doc(db, 'directMessages', threadId, 'messages', m.id),
      { [`deletedFor.${uid}`]: true },
    );
  });
  await batch.commit();
}

export async function submitServiceClaim(claim: {
  serviceId: string;
  claimedByUid: string;
  businessEmail: string;
  phone: string;
  notes: string;
}): Promise<void> {
  await addDoc(collection(db, 'serviceClaims'), {
    ...claim,
    status: 'pending',
    createdAt: Date.now(),
  });
}

export async function getSavedServices(serviceIds: string[]): Promise<any[]> {
  if (serviceIds.length === 0) return [];
  const docs = await Promise.all(
    serviceIds.slice(0, 50).map(id =>
      getDoc(doc(db, 'services', id))
        .then(snap => snap.exists() ? { id: snap.id, ...snap.data() } : null)
        .catch(() => null)
    )
  );
  return docs.filter(Boolean) as any[];
}

// --- Dashboard Layout Persistence -------------------------------------------

export type DashboardLayoutItem = { i: string; x: number; y: number; w: number; h: number; [key: string]: unknown };

export async function saveDashboardLayout(
  uid: string,
  layout: DashboardLayoutItem[],
  hiddenWidgets: string[],
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'settings', 'dashboard'),
    { layout, hiddenWidgets, savedAt: Date.now() },
    { merge: true },
  );
}

export async function loadDashboardLayout(
  uid: string,
): Promise<{ layout: DashboardLayoutItem[]; hiddenWidgets: string[] } | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'dashboard'));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!Array.isArray(data.layout)) return null;
  return {
    layout: data.layout as DashboardLayoutItem[],
    hiddenWidgets: Array.isArray(data.hiddenWidgets) ? (data.hiddenWidgets as string[]) : [],
  };
}

// --- Onboarding State Persistence --------------------------------------------

export async function saveOnboardingState(
  uid: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'settings', 'onboarding'),
    { ...patch, savedAt: Date.now(), version: 1 },
    { merge: true },
  );
}

export async function loadOnboardingState(
  uid: string,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'onboarding'));
  if (!snap.exists()) return null;
  return snap.data();
}

// ── Sign-in Activity Log ─────────────────────────────────────────────────────

export interface SignInLogEntry {
  timestamp: number;
  provider: string;
  userAgent: string;
}

export async function logSignIn(uid: string, entry: SignInLogEntry): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'signInLog'), {
    ...entry,
    createdAt: Date.now(),
  });
}

export async function getSignInLog(uid: string, limitCount = 5): Promise<SignInLogEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'signInLog'),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    ),
  );
  return snap.docs.map(d => d.data() as SignInLogEntry);
}

// ─── Group Banner ──────────────────────────────────────────────────────────────

export async function updateGroupBannerUrl(groupId: string, imageUrl: string): Promise<void> {
  await setDoc(doc(db, 'groups', groupId), { image: imageUrl }, { merge: true });
}
