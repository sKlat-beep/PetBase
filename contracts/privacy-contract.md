---
id: privacy-contract
title: Privacy Data Classification Contract - PII Enforcement
description: |-
  You are a privacy-enforcing system agent. Classify all user data before processing,
  storing, or transmitting any field. Consult the field dictionaries below. If a field
  is not listed, default to RESTRICTED_PII.

  Categories: RESTRICTED_PII | UNRESTRICTED_DATA
  Tokenized fields are a subset of UNRESTRICTED_DATA that require server-side token resolution.

  See the Field Dictionary and Tokenization sections for the full registry.
priority: high
tags:
  - privacy
  - security
  - pii
  - compliance
  - contract
createdAt: "2026-03-10T00:45:19.344Z"
contract:
  status: delivered
  deliverables:
    - type: docs
      path: planning/dev-log.md (today) or planning/archive/dev-log-completed.md (historical)
      description: Entry noting privacy contract referenced for the task
    - type: file
      path: app/src/lib/crypto.ts
      description: Encryption implementation remains the sole PII handler
  constraints:
    - RESTRICTED_PII fields must NEVER be passed to any external tool, API, embedding, or MCP call
    - All RESTRICTED_PII must be encrypted before any Firestore write using app/src/lib/crypto.ts
    - No-Cloud PII policy: medical records, expense data, and address fields must not be written to Firestore
    - Tokenized fields must never be resolved client-side - all resolution happens server-side via token exchange
    - UNRESTRICTED_DATA may be indexed, searched, and shared only with user consent
    - Do not log any RESTRICTED_PII field or token value in dev-log.md or any output
    - When adding a new data field, update the Field Dictionary in this contract before writing any code
    - If a field is not in the dictionary, treat it as RESTRICTED_PII until classified
  metrics:
    readyAt: "2026-03-10T00:45:19.344Z"
    pickedUpAt: "2026-03-10T01:01:49.906Z"
    reworkCount: 1
    deliveredAt: "2026-03-10T01:05:52.635Z"
    duration: 243
updatedAt: "2026-03-10T01:50:40.008Z"
assignee: claude-code
dueDate: "2026-03-16"
relatedFiles:
  - app/src/lib/firestoreService.ts
  - app/src/lib/crypto.ts
  - app/src/lib/tokenService.ts
  - functions/src/index.ts
completedAt: "2026-03-10T01:50:40.008Z"
---

## Privacy Data Classification Contract

You are a privacy-enforcing system agent. Classify all user data before processing.
When in doubt, treat as RESTRICTED_PII.

---

## Category 1: RESTRICTED_PII - Never share or expose

Rules:
- Encrypted at rest using field-level encryption (AES-256-GCM, PBKDF2 key via app/src/lib/crypto.ts)
- Never appears in logs, prompts, outputs, or dev-log.md
- Never inserted into vector embeddings or external search indices
- Not returned through any API unless user explicitly exports their own data
- Cannot appear in shareable cards, messaging, group features, or search results

### restricted_fields - Field Dictionary

Maintain this table. Add new fields here before writing any code that touches them.

| Field | Location | Notes |
|---|---|---|
| email | users/{uid} | Firebase Auth - never stored in Firestore or readable by others |
| phone | users/{uid}.phone | Encrypted before Firestore write |
| zipCode | users/{uid}.zipCode | Encrypted before Firestore write |
| address | users/{uid}.address | Encrypted before Firestore write |
| passwordHash | client-only | PBKDF2-derived key, never leaves device |
| encryptionSalt | localStorage | Key derivation salt - never transmitted |
| emergencyContactPhone | users/{uid}.emergencyContacts[].phone | Encrypted; shareable only if user explicitly publishes it |
| emergencyContactEmail | users/{uid}.emergencyContacts[].email | Encrypted; never shareable |
| petNotes | users/{uid}.pets[].notes | Freeform - may contain medical context; encrypted |
| expenseLabel | users/{uid}.expenses[].label | May contain sensitive context; encrypted |
| expenseAmount | users/{uid}.expenses[].amount | Financial data; encrypted |
| medicalRecords | users/{uid}.pets[].medicalRecords | Vaccines, vet visits - encrypted, client-side |
| privateField | any | Any field with visibility: private set by the user |
| securitySettings | users/{uid}.security | MFA, session tokens, recovery codes |

---

## Category 2: UNRESTRICTED_DATA - Allowed in controlled sharing features

Rules:
- Encrypted at rest (standard encryption, no field-level restrictions)
- May be indexed for search with user consent
- Allowed in shareable URLs, group views, and direct messages
- Allowed in structured outputs and API responses

### unrestricted_data - Field Dictionary

Maintain this table. Add new fields here before writing any code that touches them.

| Field | Location | Tokenized? | Notes |
|---|---|---|---|
| displayName | users/{uid}.displayName | No | Public display name - non-PII |
| username | users/{uid}.username | No | User-chosen public handle (Name#Tag format) — non-PII; user sets this voluntarily |
| avatarUrl | users/{uid}.avatarUrl | Yes | Resolved via token to prevent scraping - see Tokenization |
| petName | users/{uid}.pets[].name | No | Shareable unless pet is set to Private |
| petBreed | users/{uid}.pets[].breed | No | Public on shared cards |
| petWeight | users/{uid}.pets[].weight | No | Public on shared cards |
| petSpecies | users/{uid}.pets[].species | No | Public |
| vaccinationStatus | users/{uid}.pets[].vaccinations[].status | No | Public on shared cards |
| vaccinationName | users/{uid}.pets[].vaccinations[].name | No | Public on shared cards |
| vetName | users/{uid}.pets[].vetName | No | Shareable; opt-in |
| vetClinic | users/{uid}.pets[].vetClinic | No | Shareable; opt-in |
| groupMemberships | users/{uid}.groups[] | No | Used in community features |
| groupRetentionDays | groups/{id}.retentionDays | No | Owner-configured post retention period (integer days); no PII |
| householdName | households/{id}.name | No | User-chosen household label — non-PII; encrypted before write (stricter than required) |
| inviteCode | households/{id}.inviteCode | No | Randomly generated 6-char code — non-PII; shared intentionally by owner |
| householdOwnerId | households/{id}.ownerId | No | UID reference only — no identifying data beyond uid |
| messageContent | messages/{id}.content | No | Between consenting users only |
| messageFromUid | messages/{id}.fromUid | No | UID reference only — no identifying data beyond uid; required for access control |
| messageToUid | messages/{id}.toUid | No | UID reference only — no identifying data beyond uid; required for access control |
| messageThreadId | messages/{id}.threadId | No | Composite of two sorted UIDs — structural routing key; no PII |
| messageParticipants | messages/{id}.participants | No | Array of [fromUid, toUid] sorted — Firestore array-contains index key; no PII |
| messageCreatedAt | messages/{id}.createdAt | No | Unix timestamp; metadata only |
| messageExpiresAt | messages/{id}.expiresAt | No | TTL timestamp (createdAt + 365 days); used by cleanup function only |
| messageRead | messages/{id}.read | No | Boolean read-receipt flag; no PII |
| messageDeletedBySender | messages/{id}.deletedBySender | No | Boolean soft-delete flag; no PII |
| messageDeletedByRecipient | messages/{id}.deletedByRecipient | No | Boolean soft-delete flag; no PII |
| emergencyContactName | users/{uid}.emergencyContacts[].name | No | Shareable only if user publishes it |
| emergencyContactRelation | users/{uid}.emergencyContacts[].relation | No | Shareable only if user publishes it |
| lostPetStatus | users/{uid}.pets[].lostStatus | No | Community alert - opt-in by user action |
| petCardShareUrl | generated | Yes | Tokenized shareable URL - see Tokenization |
| petVisibility | users/{uid}.pets[].visibility | No | public / private controls exposure |
| avatarShape | users/{uid}.avatarShape | No | Display preference (circle/square/squircle) — non-PII |
| profileVisibility | users/{uid}.visibility | No | User's own profile visibility setting (Public/Friends Only/Private) |
| publicStatus | users/{uid}.publicStatus | No | Opt-in social status (Open to Playdates, etc.) — user-controlled |
| nameLower | groups/{id}.nameLower | No | Lowercase normalized group name for case-insensitive uniqueness queries; derived from user-chosen group name — non-PII |

---

## Tokenized Fields

Tokenized fields are UNRESTRICTED_DATA fields exposed in user-facing features where the raw value
must not be directly accessible client-side. A short-lived opaque token is issued instead.
All token resolution happens server-side only.

| Token Type | Resolves To | TTL | Use Case |
|---|---|---|---|
| avatar_token | avatarUrl (Firebase Storage URL) | 1 hour | Profile pictures in social features |
| card_share_token | Full petCardShareUrl payload | 7 days | Shareable QR/URL for pet cards |
| export_token | User encrypted data export | 15 min | Personal data export flow |

Token Rules:
- Tokens are single-use or time-bounded
- Token resolution is performed by a Firebase Cloud Function, never client-side JS
- Revoked tokens return 403 Forbidden
- No RESTRICTED_PII field may ever have a token created for it (export_token is the only exception, and only for the data owner)

---

## Firestore Rule Rationale

### Pet Documents (users/{uid}/pets/{petId})
Any authenticated user may read any pet document. This is intentional:
- Pet notes (the only RESTRICTED_PII field on pets) are encrypted client-side with AES-256-GCM
- Metadata fields (breed, weight, species) are classified as UNRESTRICTED_DATA (see table above)
- `isPrivate` filtering is enforced app-side for UI display purposes only
- Audited 2026-03-17: confirmed acceptable risk given encryption guarantees

---

## Operational Rules

1. Consult the field dictionaries above before writing any code that touches user data.
2. When adding a new field: add it to the correct table first, merge the PR, then write the code.
3. Never transform or process RESTRICTED_PII with an external tool, vector DB, or embedding generator.
4. Only handle UNRESTRICTED_DATA for multi-user access features.
5. Tokenized fields must never be resolved client-side.
6. If a field is not in either dictionary, classify as RESTRICTED_PII until reviewed.
