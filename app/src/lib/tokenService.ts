/**
 * tokenService — Server-side token resolution for UNRESTRICTED_DATA/Tokenized fields.
 *
 * Tokenized fields (avatarUrl, petCardShareUrl) must NEVER be resolved client-side
 * from raw Firestore data. All resolution goes through a controlled Cloud Function
 * that enforces auth and returns a short-lived URL.
 *
 * See contracts/privacy-contract.md for the authoritative field dictionaries.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

/**
 * Resolve another user's avatar URL via the `resolveAvatarToken` Cloud Function.
 * The function authenticates the caller, loads the raw URL from Firestore using
 * the Admin SDK (bypassing client-side security rules), and returns it as a
 * controlled response — the raw Storage URL never flows through search results.
 *
 * Returns a signed Firebase Storage URL with 1-hour TTL (Task-20 compliance).
 * Falls back to raw URL for base64 data URLs, external auth photos, or emulator.
 */
export async function getAvatarUrl(uid: string, fallbackUrl?: string): Promise<string> {
  try {
    const fn = httpsCallable<{ uid: string }, { url: string }>(
      functions,
      'resolveAvatarToken'
    );
    const result = await fn({ uid });
    return result.data.url;
  } catch {
    // Safe fallback: base64 data URLs and external OAuth photos (Google, etc.) are not Storage URLs
    // and carry no scraping risk. Raw Firebase Storage URLs must never bypass the token service.
    if (fallbackUrl?.startsWith('data:') || fallbackUrl?.startsWith('https://lh')) {
      return fallbackUrl;
    }
    return ''; // render initials
  }
}
