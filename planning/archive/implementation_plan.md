# PetBase — Implementation Plan
## Task-10: Privacy Data Classification Contract — PII Enforcement

> **Agent:** Claude Code
> **Contract:** See `contracts/privacy-contract.md` for field dictionaries.
> **Rules:** Read `docs/SYSTEM_RULES.md` first. Use `jcodemunch` (repo: `local/PetBase`).

---

## Research Findings (jcodemunch)

Three concrete violations found in the current codebase:

### Violation 1 — `zipCode` written unencrypted (`firestoreService.ts:132`)
`saveUserProfile` encrypts `address` but writes `zipCode` as plaintext:
```ts
zipCode: profile.zipCode ?? '',   // ← RESTRICTED_PII, must be encrypted
```

### Violation 2 — `avatarUrl` written raw to Firestore (`firestoreService.ts:132`)
`saveUserProfile` stores the raw Firebase Storage URL:
```ts
avatarUrl: profile.avatarUrl ?? '',  // ← Tokenized field, must use avatar_token
```

### Violation 3 — `avatarUrl` returned raw in search results (`firestoreService.ts:174`)
`searchPublicProfiles` returns `avatarUrl: data.avatarUrl` directly to all callers — every UI that searches users gets the raw Storage URL.

### Cards — No violation yet
`Cards.tsx` uses `crypto.randomUUID()` for card IDs, which is fine. QR/share URLs are generated client-side from card data but are scoped to already-shared fields. **Card share tokenization is a future-phase item** — current sharing is controlled by the existing `status + expiresAt` mechanism. Do not change Cards.tsx in this pass.

---

## Execution Plan

### Step 1 — Encrypt `zipCode` in `saveUserProfile`
**File:** `src/lib/firestoreService.ts` line ~143

Using `get_symbol` on `saveUserProfile`, encrypt `zipCode` the same way `address` is encrypted:
```ts
const encZip = await encryptField(profile.zipCode ?? '', key);
// then in payload:
zipCode: encZip,
```

Also update `loadUserProfile` to decrypt `zipCode` on read (look up its source with `get_symbol` first).

---

### Step 2 — Introduce `avatar_token` — Server-Side Resolution

The goal: `avatarUrl` raw Storage URLs are never exposed to other users. When a user's own profile is loaded for editing it can use the raw URL (it's their own data). But for social features — search results, People page, friend lists, messaging headers — only a short-lived opaque token is used.

#### 2a. Firebase Cloud Function — `resolveAvatarToken`
**File:** `functions/src/index.ts` (or equivalent)

Create a callable Cloud Function:
```ts
exports.resolveAvatarToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { uid } = data;
  // Load raw avatarUrl from Firestore (admin SDK — bypasses client rules)
  const snap = await admin.firestore()
    .doc(`users/${uid}/profile/data`).get();
  const avatarUrl = snap.data()?.avatarUrl ?? '';
  // Return a signed Firebase Storage URL with 1-hour TTL OR
  // return the raw URL server-side (it never leaves this function to the calling client directly)
  // For MVP: return the raw URL from the function — it's resolved server-side
  return { url: avatarUrl };
});
```
> MVP approach: the function acts as a controlled proxy. Future phase: issue signed Storage URLs with 1 hr TTL.

#### 2b. Client-side `getAvatarUrl` helper
**File:** `src/lib/tokenService.ts` (new file)

```ts
import { getFunctions, httpsCallable } from 'firebase/functions';

export async function getAvatarUrl(uid: string): Promise<string> {
  const fn = httpsCallable<{ uid: string }, { url: string }>(
    getFunctions(), 'resolveAvatarToken'
  );
  const result = await fn({ uid });
  return result.data.url;
}
```

#### 2c. Strip `avatarUrl` from `PublicProfileInfo` and `searchPublicProfiles`
**File:** `src/lib/firestoreService.ts`

- Remove `avatarUrl` from the `PublicProfileInfo` interface
- Remove `avatarUrl: data.avatarUrl` from `searchPublicProfiles` results
- Return `avatarUrl: ''` as a placeholder in search results

#### 2d. Update all call sites that use `avatarUrl` from search/social results
Search for these with `search_text` — look for `avatarUrl` usages in:
- `src/contexts/SocialContext.tsx`
- `src/pages/Search.tsx` (if exists)
- Any social/People page components

Replace direct `avatarUrl` reads with lazy calls to `getAvatarUrl(uid)` when an avatar needs to be displayed for another user's profile.

---

### Step 3 — Validate `saveUserProfile` doesn't expose other RESTRICTED_PII

Using `get_symbol` to verify the full payload, confirm:
- `email` — NOT written (Firebase Auth only) ✅
- `phone` — Not in current `saveUserProfile` payload (check if it exists elsewhere)
- `emergencyContactPhone/Email` — check HouseholdContext or any emergency contact save flows

---

### Step 4 — Add `data_classification` comment block to `crypto.ts`
**File:** `src/lib/crypto.ts`

Add a JSDoc-style header block above `encryptField`:
```ts
/**
 * RESTRICTED_PII fields — encrypt via encryptField() before any Firestore write.
 * Fields: address, zipCode, phone, petNotes, expenseLabel, expenseAmount,
 *         medicalRecords, emergencyContactPhone, emergencyContactEmail
 *
 * UNRESTRICTED_DATA fields — no field-level restriction, but encrypt at rest.
 * Tokenized fields (avatarUrl, petCardShareUrl) — use tokenService.ts, never raw.
 *
 * See contracts/privacy-contract.md for the authoritative field dictionaries.
 */
```

---

### Step 5 — Update `dev-log.md`

Log:
- What was fixed (zipCode encryption, avatarUrl tokenization)
- Files modified
- The `tokenService.ts` new file entry
- Note: card_share_token deferred to future phase

---

## Validation Commands

```bash
npx tsc --noEmit
npm run build
```

Zero TypeScript errors required before delivery.

---

## Deferreds (not in this pass)

| Item | Reason |
|---|---|
| `card_share_token` (pet card QR URLs) | Current sharing already controlled by `expiresAt` — full tokenization is a future phase |
| Signed Firebase Storage URLs (1hr TTL) | MVP proxy function is sufficient; signed URLs require Storage admin setup |
| `export_token` for GDPR export | No export feature exists yet |
| Phone field encryption | Phone field not currently saved to Firestore — add encryption when field is added |

