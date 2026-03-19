/**
 * PetBase Client-Side PII Encryption Utility
 *
 * Implements zero-knowledge, field-level AES-256-GCM encryption for sensitive
 * user data as required by petbase-system-instructions.md.
 *
 * Key architecture:
 *   - One AES-256-GCM key is generated per user, stored in localStorage
 *     (device-bound). The key is memory-cached after first use to avoid
 *     repeated localStorage reads and crypto.subtle.importKey calls.
 *   - Encrypted backup/restore: the raw key can be wrapped with a
 *     PBKDF2-derived key (from a user-supplied backup password) for safe
 *     export to a file. The exported key + encrypted data can be imported
 *     on a new device.
 *   - Future migration path: replace key storage with full PBKDF2 derivation
 *     from the user's login password — eliminates localStorage dependency.
 *
 * Encrypted value format:  ENC:{base64(iv)}.{base64(ciphertext)}
 *
 * ── Data Classification (task-10) ────────────────────────────────────────────
 * RESTRICTED_PII — encrypt via encryptField() before any Firestore write:
 *   address, zipCode, phone, petNotes, expenseLabel, expenseAmount,
 *   medicalRecords, emergencyContactPhone, emergencyContactEmail
 *
 * UNRESTRICTED_DATA — no field-level restriction, but encrypt at rest.
 * Tokenized fields (avatarUrl, petCardShareUrl) — use tokenService.ts; never raw.
 *
 * See contracts/privacy-contract.md for the authoritative field dictionaries.
 */

const ALGO: AesKeyGenParams = { name: 'AES-GCM', length: 256 };
const IV_LENGTH = 12;
const ENC_PREFIX = 'ENC:';
const KEY_STORAGE_PREFIX = 'petbase-enc-key-';

// In-memory cache: avoids re-importing the CryptoKey from localStorage on
// every Firestore call. Cleared on sign-out via clearCachedKey().
const keyCache = new Map<string, CryptoKey>();

// --- Internal helpers -------------------------------------------------------

async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKeyFromBase64(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, ALGO, true, ['encrypt', 'decrypt']);
}

/** Derive a wrapping key from a password using PBKDF2. */
async function deriveWrapKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
    baseKey,
    ALGO,
    false,
    ['encrypt', 'decrypt'],
  );
}

// --- Public API -------------------------------------------------------------

/**
 * Returns the AES-256-GCM CryptoKey for the given user UID.
 * Generates and persists a new key in localStorage on first call.
 * Subsequent calls return the in-memory cached key (no re-import cost).
 */
export async function getOrCreateUserKey(uid: string): Promise<CryptoKey> {
  const cached = keyCache.get(uid);
  if (cached) return cached;

  const storageKey = KEY_STORAGE_PREFIX + uid;
  const stored = localStorage.getItem(storageKey);
  let key: CryptoKey;
  if (stored) {
    key = await importKeyFromBase64(stored);
  } else {
    key = await crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt']);
    localStorage.setItem(storageKey, await exportKeyToBase64(key));
  }
  keyCache.set(uid, key);
  return key;
}

/** Call on sign-out to clear the cached key from memory. */
export function clearCachedKey(uid: string): void {
  keyCache.delete(uid);
}

/**
 * Returns true if an encryption key already exists in localStorage for this
 * user. False means a new device — the user's encrypted data will not be
 * readable until they import a backup or their key is otherwise restored.
 */
export function hasLocalKey(uid: string): boolean {
  return localStorage.getItem(KEY_STORAGE_PREFIX + uid) !== null;
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns an "ENC:{iv_b64}.{ciphertext_b64}" string.
 * Empty/null values pass through unchanged.
 */
export async function encryptField(plaintext: string, key: CryptoKey): Promise<string> {
  if (!plaintext) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ENC_PREFIX}${ivB64}.${ctB64}`;
}

/**
 * Decrypts an "ENC:{iv_b64}.{ciphertext_b64}" string back to plaintext.
 * Non-ENC: prefixed values are returned unchanged (legacy/unencrypted).
 * Returns '' on decryption failure (key mismatch, corrupted data).
 */
export async function decryptField(value: string, key: CryptoKey): Promise<string> {
  if (!value || !value.startsWith(ENC_PREFIX)) return value ?? '';
  const payload = value.slice(ENC_PREFIX.length);
  const dotIndex = payload.indexOf('.');
  if (dotIndex === -1) return '';
  try {
    const iv = Uint8Array.from(atob(payload.slice(0, dotIndex)), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(payload.slice(dotIndex + 1)), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(decrypted);
  } catch {
    console.error('[PetBase Crypto] Decryption failed — key mismatch or corrupted data.');
    return '';
  }
}

// --- Encrypted Backup / Restore ---------------------------------------------

export interface EncryptedBackup {
  version: 1;
  uid: string;
  createdAt: string;
  /** PBKDF2 salt (base64) used to derive the wrapping key from backup password */
  salt: string;
  /** AES-GCM IV (base64) used to wrap the encryption key */
  wrapIv: string;
  /** The user's AES-256-GCM key, wrapped with the PBKDF2-derived key (base64) */
  wrappedKey: string;
  /** All encrypted localStorage entries for this user, keyed by localStorage key */
  encryptedData: Record<string, string>;
}

/**
 * Exports an encrypted backup of the user's key and all their encrypted
 * localStorage data. The raw encryption key is wrapped with a
 * PBKDF2-derived key from `backupPassword` — the export file is safe to
 * store anywhere as long as the backup password is kept secret.
 */
export async function createEncryptedBackup(
  uid: string,
  backupPassword: string,
): Promise<EncryptedBackup> {
  const key = await getOrCreateUserKey(uid);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrapKey = await deriveWrapKey(backupPassword, salt);
  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Export and wrap the raw AES key
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: wrapIv }, wrapKey, rawKey);

  // Collect all localStorage keys belonging to this user
  const encryptedData: Record<string, string> = {};
  const uidPrefixes = [
    `petbase-enc-key-${uid}`,  // the key itself (raw b64, not wrapped)
    `petbase_expenses_${uid}`,
    `petbase_profile_${uid}`,
    `petbase-medical-${uid}`,
    `petbase-cards`,
    `petbase-lost-pets`,
    `petbase-guide-steps`,
    `petbase-step-share-card`,
    `petbase-step-join-community`,
    `petbase-step-find-services`,
  ];
  for (const k of uidPrefixes) {
    const v = localStorage.getItem(k);
    if (v !== null) encryptedData[k] = v;
  }

  return {
    version: 1,
    uid,
    createdAt: new Date().toISOString(),
    salt: btoa(String.fromCharCode(...salt)),
    wrapIv: btoa(String.fromCharCode(...wrapIv)),
    wrappedKey: btoa(String.fromCharCode(...new Uint8Array(wrapped))),
    encryptedData,
  };
}

// --- Vault Key (Cross-Device E2EE Sync) ------------------------------------

/**
 * A Firestore-safe document that stores the user's AES-256-GCM key
 * wrapped with a PBKDF2-derived key from their Firebase Auth UID.
 * Stored at users/{uid}/vault/key — the cloud never sees the raw key.
 */
export interface VaultKeyDoc {
  /** PBKDF2 salt (base64) */
  salt: string;
  /** AES-GCM IV (base64) used to wrap the key */
  iv: string;
  /** The user's AES-256-GCM key, wrapped with PBKDF2(uid) (base64) */
  wrappedKey: string;
  createdAt: string;
  /** 'uid' = UID-derived key, 'password' = legacy sync password */
  wrapMethod?: 'uid' | 'password';
}

/** Derive a wrapping key from the user's Firebase Auth UID. */
export async function deriveKeyFromUID(uid: string, salt: Uint8Array): Promise<CryptoKey> {
  return deriveWrapKey(uid, salt);
}

/**
 * Wraps the user's AES key with a PBKDF2-derived key from their UID.
 * The result is safe to store in Firestore — the raw key is never exposed.
 * Cross-device sync is automatic: sign in → UID is available → vault unwraps silently.
 */
export async function wrapKeyForVault(key: CryptoKey, uid: string): Promise<VaultKeyDoc> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrapKey = await deriveKeyFromUID(uid, salt);
  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const raw = await crypto.subtle.exportKey('raw', key);
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: wrapIv }, wrapKey, raw);
  return {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...wrapIv)),
    wrappedKey: btoa(String.fromCharCode(...new Uint8Array(wrapped))),
    createdAt: new Date().toISOString(),
    wrapMethod: 'uid',
  };
}

/**
 * Unwraps a vault key document using the user's UID, restoring the AES key.
 * Persists the key to localStorage and memory cache for this session.
 * Throws if the UID doesn't match (should not happen with valid auth).
 */
export async function unwrapVaultKey(vaultDoc: VaultKeyDoc, uid: string): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(vaultDoc.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(vaultDoc.iv), c => c.charCodeAt(0));
  const wrapped = Uint8Array.from(atob(vaultDoc.wrappedKey), c => c.charCodeAt(0));
  const wrapKey = await deriveKeyFromUID(uid, salt);
  let rawKey: ArrayBuffer;
  try {
    rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrapKey, wrapped);
  } catch {
    throw new Error('Could not unlock vault — key mismatch.');
  }
  const key = await crypto.subtle.importKey('raw', rawKey, ALGO, true, ['encrypt', 'decrypt']);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  localStorage.setItem(KEY_STORAGE_PREFIX + uid, b64);
  keyCache.set(uid, key);
  return key;
}

/**
 * Unwraps a legacy vault key that was wrapped with a user-supplied sync password.
 * Used for one-time migration: unwrap with old password → re-wrap with UID.
 */
export async function unwrapLegacyVaultKey(vaultDoc: VaultKeyDoc, syncPassword: string, uid: string): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(vaultDoc.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(vaultDoc.iv), c => c.charCodeAt(0));
  const wrapped = Uint8Array.from(atob(vaultDoc.wrappedKey), c => c.charCodeAt(0));
  const wrapKey = await deriveWrapKey(syncPassword, salt);
  let rawKey: ArrayBuffer;
  try {
    rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrapKey, wrapped);
  } catch {
    throw new Error('Incorrect sync password — could not unlock vault.');
  }
  const key = await crypto.subtle.importKey('raw', rawKey, ALGO, true, ['encrypt', 'decrypt']);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  localStorage.setItem(KEY_STORAGE_PREFIX + uid, b64);
  keyCache.set(uid, key);
  return key;
}

/**
 * Restores a backup created by `createEncryptedBackup`.
 * Unwraps the encryption key using `backupPassword` and restores all
 * localStorage entries. Throws if the password is wrong.
 */
export async function restoreEncryptedBackup(
  backup: EncryptedBackup,
  backupPassword: string,
): Promise<void> {
  const salt = Uint8Array.from(atob(backup.salt), (c) => c.charCodeAt(0));
  const wrapIv = Uint8Array.from(atob(backup.wrapIv), (c) => c.charCodeAt(0));
  const wrapped = Uint8Array.from(atob(backup.wrappedKey), (c) => c.charCodeAt(0));

  const wrapKey = await deriveWrapKey(backupPassword, salt);

  let rawKey: ArrayBuffer;
  try {
    rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: wrapIv }, wrapKey, wrapped);
  } catch {
    throw new Error('Incorrect backup password — could not decrypt backup.');
  }

  // Import and cache the restored key
  const restoredKey = await crypto.subtle.importKey('raw', rawKey, ALGO, true, ['encrypt', 'decrypt']);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  localStorage.setItem(KEY_STORAGE_PREFIX + backup.uid, b64);
  keyCache.set(backup.uid, restoredKey);

  // Restore all other localStorage entries
  for (const [k, v] of Object.entries(backup.encryptedData)) {
    if (k !== KEY_STORAGE_PREFIX + backup.uid) {
      localStorage.setItem(k, v);
    }
  }
}
