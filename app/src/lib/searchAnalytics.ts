/**
 * Search Analytics — Firestore-backed search term tracker.
 *
 * Tracks ONLY manual search terms users type (not service button clicks).
 * Fire-and-forget writes to searchTerms/{slugified-term}.
 */

import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './firebase';

function slugify(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 100);
}

export function trackSearchTerm(term: string): void {
  const trimmed = term.trim();
  if (trimmed.length < 2) return;

  const slug = slugify(trimmed);
  if (!slug) return;

  const ref = doc(db, 'searchTerms', slug);
  setDoc(ref, {
    term: trimmed,
    count: increment(1),
    lastUsedAt: serverTimestamp(),
    firstSeenAt: serverTimestamp(),
  }, { merge: true }).catch(() => {
    // Fire-and-forget — silently ignore errors
  });
}
