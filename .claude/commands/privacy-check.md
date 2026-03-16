# /privacy-check Skill

**Purpose:** Pre-flight privacy compliance verification. Run before any task tagged
`privacy`, `firebase`, or `functions` moves to `review`. Blocks non-compliant tasks.

---

## Steps

1. **Identify all new or modified fields** from the task description and modified files.
   Use jcodemunch `get_file_outline` on each modified file to locate Firestore write calls.

2. **Classify each field** against `contracts/privacy-contract.md` Field Dictionary:
   - If field is present: note its classification (`RESTRICTED_PII` or `UNRESTRICTED_DATA`)
   - If field is absent: **STOP** — add the field to the Field Dictionary with its classification
     before writing any code. Default to `RESTRICTED_PII` if uncertain.

3. **For each `RESTRICTED_PII` field:**
   - Use jcodemunch `search_symbols("encrypt")` to verify that `encrypt()` from
     `app/src/lib/crypto.ts` is called on the value before any Firestore write.
   - Check that the field value is never passed to `console.log`, a MCP tool, or any
     external API in plaintext.
   - Verify no-cloud PII rule: medical records, expense data, and address fields must
     not be written to Firestore at all (even encrypted) until a compliance review passes.

4. **For tokenized fields** (e.g., `avatarUrl`):
   - Confirm no client-side resolution. Token resolution must route through the
     `resolveAvatarToken` Cloud Function only.
   - Use jcodemunch `search_symbols("tokenService")` to confirm usage pattern.

5. **For `UNRESTRICTED_DATA` fields:**
   - Confirm user has explicitly consented to sharing (check profile privacy settings flow).
   - Confirm the field is not being indexed in a way that exposes it to unauthenticated reads
     (check `firestore.rules`).

6. **Output a compliance report** in this format:
   ```
   ## Privacy Check Report — TASK-ID
   Date: YYYY-MM-DD

   | Field | Classification | Encrypted | Line | Status |
   |---|---|---|---|---|
   | fieldName | RESTRICTED_PII | yes | firestoreService.ts:132 | PASS |
   | fieldName | UNRESTRICTED_DATA | n/a | firestoreService.ts:174 | PASS |

   Result: PASS / FAIL
   Violations: <list any violations with file:line>
   ```

7. **If any FAIL:**
   - Do NOT mark the task complete or transition it to `review`.
   - Report violations to the user with the specific file and line number.
   - The task stays `in-progress` until violations are resolved and this skill re-run.

8. **If PASS:**
   - Append the compliance report as a comment in the task entry in `planning/TODO.md`.
   - Write a dev-log entry (field names only, no values):
     ```
     ## [YYYY-MM-DD] TASK-ID: Privacy Check — PASS [VERIFIED]
     Fields checked: <comma-separated field names>
     ```

---

## Hard Rules (never violate)
- Never log RESTRICTED_PII field values, only field names and line numbers.
- Never pass RESTRICTED_PII field names or values to any external tool, API, or MCP call.
- Never mark a privacy-tagged task done without running this skill first.
- If `contracts/privacy-contract.md` is inaccessible: treat all fields as RESTRICTED_PII and halt.
