import { setGlobalOptions } from 'firebase-functions/v2';
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as https from 'https';
import { latLngToCell } from 'h3-js';
import { findServicesYelp, type YelpBusiness } from './yelpService';
import { exportUserData as _exportUserData } from './exportService';
import { findPlaceId, getPlaceDetailsAndContact, getPlaceAtmosphere } from './placesService';
import { fetchOgMetadata } from './ogService';
import { incrementPlacesUsage, checkAndAlertIfOverThreshold, updateFeatureFlags } from './placesUsage';
import { postSlackBlocks, buildAlertBlock } from './slackService';

admin.initializeApp();

export { onNotificationCreated, sendWeeklyDigest, checkPetBirthdays, onPostReaction, onPostComment, onPetLostStatusChange } from './notifications';
export { cardMetaProxy } from './cardMetaProxy';
import { sendVaccineReminder } from './notifications';

// ─── Email configuration ──────────────────────────────────────────────────────
// Destination addresses are stored in Firebase Secret Manager / environment
// config and are never visible in source code or the compiled client bundle.
//
// Set via:
//   firebase functions:secrets:set SMTP_USER
//   firebase functions:secrets:set SMTP_PASS
//   firebase functions:secrets:set EMAIL_CRASH
//   firebase functions:secrets:set EMAIL_BUG
//   firebase functions:secrets:set EMAIL_FEEDBACK
//
// Values:
//   SMTP_USER    → Gmail address used to send
//   SMTP_PASS    → Gmail app password (not account password)
//   EMAIL_CRASH  → sklatdevelopment+reportdump@gmail.com
//   EMAIL_BUG    → sklatdevelopment+userreport@gmail.com
//   EMAIL_FEEDBACK → sklatdevelopment+userfeedback@gmail.com

type ReportType = 'crash' | 'bug' | 'feedback';

interface SendReportPayload {
  type: ReportType;
  message?: string;
  userEmail?: string;
  log?: string;
  errorId?: string;
}

export const sendReport = onCall(
  {
    secrets: ['SLACK_WEBHOOK_URL', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_CRASH', 'EMAIL_BUG', 'EMAIL_FEEDBACK'],
  },
  async (request) => {
    if (!request.auth) {
      logSecurityEvent('sendReport', 'unauthenticated');
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const data = request.data as SendReportPayload;

    if (!data.type || !['crash', 'bug', 'feedback'].includes(data.type)) {
      throw new HttpsError('invalid-argument', 'Invalid report type.');
    }

    // Input validation
    if (data.userEmail && (typeof data.userEmail !== 'string' || data.userEmail.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.userEmail))) {
      throw new HttpsError('invalid-argument', 'Invalid email format.');
    }
    if (data.message && (typeof data.message !== 'string' || data.message.length > 5000)) {
      throw new HttpsError('invalid-argument', 'Message too long (max 5000 chars).');
    }
    if (data.log && (typeof data.log !== 'string' || data.log.length > 50000)) {
      throw new HttpsError('invalid-argument', 'Log too long (max 50000 chars).');
    }

    const subject = (() => {
      switch (data.type) {
        case 'crash': return `[PetBase] Crash Report — ${data.errorId ?? 'unknown'}`;
        case 'bug': return `[PetBase] Bug Report from ${data.userEmail ?? 'anonymous'}`;
        case 'feedback': return `[PetBase] Feedback from ${data.userEmail ?? 'anonymous'}`;
      }
    })();

    // ── Primary: Slack (all report types) ─────────────────────────────────────
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhookUrl) {
      throw new HttpsError('failed-precondition', 'Slack webhook not configured.');
    }

    const level = data.type === 'crash' ? 'error' as const
      : data.type === 'bug' ? 'warn' as const
      : 'info' as const;

    const slackBody = [
      `*From:* ${data.userEmail ?? 'anonymous'}`,
      data.errorId ? `*Error ID:* ${data.errorId}` : null,
      data.message ? `*Message:* ${data.message.slice(0, 500)}` : null,
      data.log ? `*Diagnostic Log (truncated):*\n\`\`\`${data.log.slice(0, 1500)}\`\`\`` : null,
    ].filter(Boolean).join('\n') || 'No additional details.';

    await postSlackBlocks(slackWebhookUrl, buildAlertBlock(subject, slackBody, level));

    // ── Optional fallback: email (if SMTP is configured) ──────────────────────
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const destination = (() => {
      switch (data.type) {
        case 'crash': return process.env.EMAIL_CRASH;
        case 'bug': return process.env.EMAIL_BUG;
        case 'feedback': return process.env.EMAIL_FEEDBACK;
      }
    })();

    if (smtpUser && smtpPass && destination) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
      });
      const body = [
        `Type: ${data.type}`,
        `From: ${data.userEmail ?? 'anonymous'}`,
        data.errorId ? `Error ID: ${data.errorId}` : null,
        '',
        data.message ? `Message:\n${data.message}` : null,
        '',
        data.log ? `--- Diagnostic Log (last 7 days) ---\n${data.log}` : null,
      ].filter(Boolean).join('\n');

      transporter.sendMail({ from: smtpUser, to: destination, subject, text: body })
        .catch(() => { /* email is optional fallback — Slack is authoritative */ });
    }

    return { success: true };
  },
);

// ─── Security Event Logging ───────────────────────────────────────────────────

/**
 * Fire-and-forget Slack alert for auth/security rejections.
 * Called before throwing HttpsError('unauthenticated') or ('permission-denied').
 */
function logSecurityEvent(
  functionName: string,
  code: 'unauthenticated' | 'permission-denied',
  uid?: string,
): void {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  const detail = [
    `*Code:* \`${code}\``,
    uid ? `*UID attempt:* ${uid}` : null,
    `*Function:* ${functionName}`,
  ].filter(Boolean).join('\n');
  postSlackBlocks(webhookUrl, buildAlertBlock(`Security Event — ${functionName}`, detail, 'warn'))
    .catch(() => { /* non-critical */ });
}

// ─── Household Invite Code Resolution ─────────────────────────────────────────
// Uses admin SDK to query households by invite code (bypasses Firestore rules
// that block non-members from querying the households collection).

export const resolveInviteCode = onCall(
  { secrets: ['SLACK_WEBHOOK_URL'] },
  async (request) => {
    if (!request.auth) {
      logSecurityEvent('resolveInviteCode', 'unauthenticated');
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const { code } = request.data as { code: string };
    if (!code || typeof code !== 'string' || code.length !== 6 || !/^[A-Z0-9]+$/.test(code.toUpperCase())) {
      throw new HttpsError('invalid-argument', 'Invalid invite code format.');
    }

    const db = admin.firestore();
    const normalizedCode = code.toUpperCase().trim();

    const snap = await db.collection('households')
      .where('inviteCode', '==', normalizedCode)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError('not-found', 'Invalid invite code. Please check the code and try again.');
    }

    const householdDoc = snap.docs[0];
    const data = householdDoc.data();

    // Check invite code expiration (F6-2)
    if (data.inviteCodeExpiresAt && Date.now() > data.inviteCodeExpiresAt) {
      throw new HttpsError('failed-precondition', 'This invite code has expired. Ask the household leader for a new one.');
    }

    // Check max member limit (F6-3)
    const membersSnap = await db.collection('households').doc(householdDoc.id).collection('members').get();
    const MAX_MEMBERS = 20;
    if (membersSnap.size >= MAX_MEMBERS) {
      throw new HttpsError('resource-exhausted', 'This household is full (max 20 members).');
    }

    // Check if already a member
    const uid = request.auth.uid;
    const memberDoc = await db.doc(`households/${householdDoc.id}/members/${uid}`).get();
    if (memberDoc.exists) {
      throw new HttpsError('already-exists', 'You are already a member of this household.');
    }

    return {
      householdId: householdDoc.id,
      name: data.namePublic ?? data.name,
      ownerId: data.ownerId,
    };
  },
);

// ─── Find Services (Yelp) ─────────────────────────────────────────────────────
// Set secrets via:
//   firebase functions:secrets:set GOOGLE_PLACES_KEY   (for geocoding ZIP codes)
//   firebase functions:secrets:set YELP_API_KEY
//
// The frontend MUST call this via httpsCallable so API keys never appear
// in the client bundle.

interface ServiceDoc {
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  h3Index: string;
  phone: string;
  website: string;
  yelpId: string;
  yelpUrl: string;
  rating: number;
  reviewCount: number;
  photos: string[];
  status: 'seeded' | 'claimed' | 'verified';
  isPetBaseVerified: boolean;
  isSponsored: boolean;
  claimedByUid?: string;
  bio?: string;
  specialties: string[];
  socialLinks?: Record<string, string>;
  cachedAt: number;
}

function fetchJson(url: string, headers?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = headers ? { headers } : {};
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 500)}`));
            return;
          }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function mapYelpToServiceDoc(biz: YelpBusiness, category: string, h3Index: string): ServiceDoc & { distanceMeters?: number } {
  return {
    name: biz.name,
    category,
    address: biz.location.display_address.join(', '),
    lat: biz.coordinates.latitude,
    lng: biz.coordinates.longitude,
    h3Index,
    phone: biz.phone ?? '',
    website: '',
    yelpId: biz.id,
    yelpUrl: biz.url,
    rating: biz.rating,
    reviewCount: biz.review_count,
    photos: biz.image_url ? [biz.image_url] : [],
    status: 'seeded',
    isPetBaseVerified: false,
    isSponsored: false,
    specialties: [],
    cachedAt: Date.now(),
    distanceMeters: biz.distance,
  };
}

function mapToServiceResult(docs: (ServiceDoc & { id: string; distanceMeters?: number })[]) {
  return [...docs]
    .sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0) || b.rating - a.rating)
    .map(d => ({
      id: d.id,
      name: d.name,
      type: d.category,
      rating: d.rating,
      reviews: d.reviewCount,
      distance: d.distanceMeters ? `${(d.distanceMeters / 1609.34).toFixed(1)} mi` : '',
      address: d.address,
      image: d.photos[0] ?? '',
      yelpUrl: d.yelpUrl,
      googleUrl: '',
      isPetBaseVerified: d.isPetBaseVerified,
      isSponsored: d.isSponsored,
      claimedByUid: d.claimedByUid,
      bio: d.bio,
      specialties: d.specialties,
      socialLinks: d.socialLinks,
      status: d.status,
      isVerified: d.isPetBaseVerified,
      petVerified: false,
      tags: d.specialties,
    }));
}

/** Background cache refresh for stale-while-revalidate pattern. */
async function refreshCache(
  db: FirebaseFirestore.Firestore,
  lat: number, lng: number, type: string, h3Index: string,
  zipCacheId: string | null, h3CacheId: string,
  query?: string, radius?: number,
  globalUsageRef?: FirebaseFirestore.DocumentReference,
  currentCount?: number, HARD_LIMIT?: number, WARN_THRESHOLD?: number,
): Promise<void> {
  if (currentCount != null && HARD_LIMIT != null && currentCount >= HARD_LIMIT) return;
  const yelpApiKey = process.env.YELP_API_KEY;
  if (!yelpApiKey) return;
  const searchRadius = (radius && Number.isFinite(radius) && radius > 0 && radius <= 40000) ? radius : 8000;
  const businesses = await findServicesYelp(lat, lng, type, yelpApiKey, query, searchRadius);
  if (businesses.length === 0) return;

  const serviceIds: string[] = [];
  const batch = db.batch();
  for (const biz of businesses) {
    const serviceId = `yelp_${biz.id}`;
    serviceIds.push(serviceId);
    batch.set(db.doc(`services/${serviceId}`), mapYelpToServiceDoc(biz, type, h3Index), { merge: true });
  }
  batch.set(db.doc(`serviceCache/${h3CacheId}`), { serviceIds, cachedAt: Date.now(), source: 'yelp' });
  if (zipCacheId) {
    batch.set(db.doc(`zipCache/${zipCacheId}`), {
      serviceIds, cachedAt: Date.now(), source: 'yelp',
      zipCode: zipCacheId.split('_')[0], type, lat, lng,
    });
  }
  if (globalUsageRef) {
    batch.set(globalUsageRef, { count: admin.firestore.FieldValue.increment(1) }, { merge: true });
  }
  await batch.commit();
  console.log(`[refreshCache] Background refresh complete for ${zipCacheId ?? h3CacheId}`);
  if (currentCount != null && WARN_THRESHOLD != null && currentCount + 1 > WARN_THRESHOLD) {
    console.warn(`[refreshCache] Yelp API warning: ${(currentCount ?? 0) + 1}/${HARD_LIMIT} calls today.`);
  }
}

export const findServices = onCall(
  { secrets: ['GOOGLE_PLACES_KEY', 'YELP_API_KEY'] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logSecurityEvent('findServices', 'unauthenticated');
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const db = admin.firestore();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { type, location, query, radius } = request.data as {
      type: string;
      location: string;
      query?: string;
      lat?: number;
      lng?: number;
      radius?: number;
    };
    let { lat, lng } = request.data as { lat?: number; lng?: number };

    // Validate lat/lng if provided
    if (lat != null && (typeof lat !== 'number' || !isFinite(lat) || lat < -90 || lat > 90)) {
      throw new HttpsError('invalid-argument', 'Invalid latitude (must be between -90 and 90).');
    }
    if (lng != null && (typeof lng !== 'number' || !isFinite(lng) || lng < -180 || lng > 180)) {
      throw new HttpsError('invalid-argument', 'Invalid longitude (must be between -180 and 180).');
    }

    console.log(`[findServices] invoked — type=${type} location=${location} lat=${lat} lng=${lng} query=${query ?? ''} uid=${uid}`);

    const HARD_LIMIT = 450;
    const WARN_THRESHOLD = 400;

    // Global daily rate limit check — path is 2 segments: collection "apiUsage", document "yelp_YYYY-MM-DD"
    const globalUsageRef = db.doc(`apiUsage/yelp_${today}`);
    const globalUsageSnap = await globalUsageRef.get();
    const currentCount = (globalUsageSnap.data()?.count ?? 0) as number;
    console.log(`[findServices] Yelp daily usage: ${currentCount}/${HARD_LIMIT}`);

    // ── Resolve coordinates via zipGeo cache (Phase 2a) ─────────────────────
    const isZip = /^\d{5}$/.test(location);
    if (lat == null || lng == null) {
      // Check zipGeo Firestore cache first
      if (isZip) {
        const zipGeoSnap = await db.doc(`zipGeo/${location}`).get();
        if (zipGeoSnap.exists) {
          const cached = zipGeoSnap.data()!;
          lat = cached.lat as number;
          lng = cached.lng as number;
          console.log(`[findServices] zipGeo cache hit for ${location}`);
        }
      }
      // Fall back to Google Geocoding API
      if (lat == null || lng == null) {
        const googleKey = process.env.GOOGLE_PLACES_KEY;
        if (!googleKey) throw new HttpsError('failed-precondition', 'Google key not configured.');
        console.log(`[findServices] Geocoding location: "${location}"`);
        const geoData = await fetchJson(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleKey}`,
        ) as { status: string; results: { geometry: { location: { lat: number; lng: number } } }[] };
        console.log(`[findServices] Geocode status: ${geoData.status} — result count: ${geoData.results?.length ?? 0}`);
        const loc = geoData.results?.[0]?.geometry?.location;
        if (!loc) {
          return { results: [], error: { code: 'location-not-found', message: 'Could not find that location. Check your ZIP code.' } };
        }
        lat = loc.lat;
        lng = loc.lng;
        // Store in zipGeo cache for future lookups
        if (isZip) {
          await db.doc(`zipGeo/${location}`).set({ lat, lng, resolvedAt: Date.now() });
          console.log(`[findServices] zipGeo cache stored for ${location}`);
        }
      }
    }
    console.log(`[findServices] Resolved coords — lat=${lat} lng=${lng}`);

    // H3 index at resolution 7 (~5km)
    const h3Index = latLngToCell(lat, lng, 7);
    const h3CacheId = `${h3Index}_${type}`;
    const zipCacheId = isZip ? `${location}_${type}` : null;

    // ── Cache check priority: zipCache → serviceCache (Phase 2c) ──────────
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Helper to resolve serviceIds → ServiceResult[]
    const resolveServiceIds = async (serviceIds: string[]) => {
      const serviceDocs = await Promise.all(serviceIds.map(id => db.doc(`services/${id}`).get()));
      return serviceDocs
        .filter(d => d.exists)
        .map(d => ({ id: d.id, ...(d.data() as ServiceDoc) }));
    };

    // 1. Check zipCache first (shared across all users for same ZIP)
    if (zipCacheId) {
      const zipCacheSnap = await db.doc(`zipCache/${zipCacheId}`).get();
      if (zipCacheSnap.exists) {
        const zipData = zipCacheSnap.data()!;
        const ageMs = Date.now() - ((zipData.cachedAt as number) ?? 0);
        if (ageMs < SEVEN_DAYS_MS) {
          const serviceIds: string[] = zipData.serviceIds ?? [];
          const results = await resolveServiceIds(serviceIds);
          console.log(`[findServices] zipCache hit for ${zipCacheId} (age: ${Math.round(ageMs / 3600000)}h)`);
          // Stale-while-revalidate: if 2-7 days old, serve stale + refresh in background
          if (ageMs >= TWO_DAYS_MS) {
            console.log(`[findServices] zipCache stale (${Math.round(ageMs / 86400000)}d) — background refresh`);
            // Fire-and-forget background refresh (don't await)
            refreshCache(db, lat, lng, type, h3Index, zipCacheId, h3CacheId, query, radius, globalUsageRef, currentCount, HARD_LIMIT, WARN_THRESHOLD).catch(e => console.error('[findServices] background refresh failed:', e));
          }
          return { results: mapToServiceResult(results) };
        }
      }
    }

    // 2. Check H3 serviceCache (backward compat / fallback)
    const cacheRef = db.doc(`serviceCache/${h3CacheId}`);
    const cacheSnap = await cacheRef.get();
    console.log(`[findServices] H3 cache key: ${h3CacheId} — exists: ${cacheSnap.exists}`);
    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data()!;
      const ageMs = Date.now() - ((cacheData.cachedAt as number) ?? 0);
      if (ageMs < SEVEN_DAYS_MS) {
        const serviceIds: string[] = cacheData.serviceIds ?? [];
        const results = await resolveServiceIds(serviceIds);
        return { results: mapToServiceResult(results) };
      }
    }

    // Hard limit — return empty rather than error
    if (currentCount >= HARD_LIMIT) {
      console.warn(`Yelp daily limit reached (${currentCount}/${HARD_LIMIT}). Returning empty.`);
      return { results: [], error: { code: 'api-unavailable', message: 'Service temporarily unavailable. Try again later.' } };
    }

    // ── Fetch from Yelp ───────────────────────────────────────────────────
    const yelpApiKey = process.env.YELP_API_KEY;
    if (!yelpApiKey) throw new HttpsError('failed-precondition', 'Yelp API key not configured.');
    console.log(`[findServices] Calling Yelp API — category=${type} lat=${lat} lng=${lng}`);
    const searchRadius = (radius && Number.isFinite(radius) && radius > 0 && radius <= 40000) ? radius : 8000;
    const businesses = await findServicesYelp(lat, lng, type, yelpApiKey, query, searchRadius);
    console.log(`[findServices] Yelp returned ${businesses.length} businesses`);

    // Persist services and write to both caches
    const serviceIds: string[] = [];
    const batch = db.batch();
    for (const biz of businesses) {
      const serviceId = `yelp_${biz.id}`;
      serviceIds.push(serviceId);
      const serviceRef = db.doc(`services/${serviceId}`);
      const serviceDoc: ServiceDoc = mapYelpToServiceDoc(biz, type, h3Index);
      batch.set(serviceRef, serviceDoc, { merge: true });
    }

    // Write H3 cache (backward compat)
    batch.set(cacheRef, { serviceIds, cachedAt: Date.now(), source: 'yelp' });
    // Write ZIP cache (new shared cache)
    if (zipCacheId) {
      batch.set(db.doc(`zipCache/${zipCacheId}`), {
        serviceIds, cachedAt: Date.now(), source: 'yelp',
        zipCode: location, type, lat, lng,
      });
    }
    batch.set(globalUsageRef, { count: admin.firestore.FieldValue.increment(1) }, { merge: true });
    await batch.commit();

    if (currentCount + 1 > WARN_THRESHOLD) {
      console.warn(`Yelp API warning: ${currentCount + 1}/${HARD_LIMIT} calls today.`);
    }

    const allDocs = businesses.map(biz => ({
      id: `yelp_${biz.id}`,
      ...mapYelpToServiceDoc(biz, type, h3Index),
    }));
    return { results: mapToServiceResult(allDocs) };
  },
);

// ─── Get Place Details (Google Places — Essentials + Contact tier) ────────────
// Called when user opens a ServiceDetailModal.
// Checks feature flag, uses 30-day Firestore cache, increments usage counters.

export const getPlaceDetails = onCall(
  { secrets: ['GOOGLE_PLACES_KEY', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_CRASH', 'SLACK_WEBHOOK_URL'] },
  async (request) => {
    if (!request.auth) {
      logSecurityEvent('getPlaceDetails', 'unauthenticated');
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const { serviceId, name, address } = request.data as { serviceId: string; name: string; address: string };

    // Input validation
    const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
    if (!serviceId || typeof serviceId !== 'string' || serviceId.length > 200 || !ID_PATTERN.test(serviceId)) {
      throw new HttpsError('invalid-argument', 'Invalid serviceId.');
    }
    if (!name || typeof name !== 'string' || name.length > 200) {
      throw new HttpsError('invalid-argument', 'Invalid name (max 200 chars).');
    }
    if (!address || typeof address !== 'string' || address.length > 200) {
      throw new HttpsError('invalid-argument', 'Invalid address (max 200 chars).');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;

    // Per-user daily rate limit (10 detail lookups/day)
    const today = new Date().toISOString().slice(0, 10);
    const usageRef = db.doc(`apiUsage/places_details_user_${uid}_${today}`);
    const usageSnap = await usageRef.get();
    const count = (usageSnap.exists ? usageSnap.data()!.count : 0) as number;
    const DAILY_LIMIT = 10;
    if (count >= DAILY_LIMIT) {
      throw new HttpsError('resource-exhausted', 'Daily detail lookup limit reached. Try again tomorrow.');
    }
    await usageRef.set({ count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });

    // Feature flag check
    const flagsSnap = await db.doc('appConfig/places').get();
    const flags = flagsSnap.data() ?? {};
    if (flags.contactTierEnabled === false) {
      return { details: null, flagged: true };
    }

    // 30-day cache check
    const cacheKey = `details:essentials+contact:v1:${serviceId}`;
    const cacheRef = db.doc(`serviceCache/${cacheKey}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data()!;
      if (Date.now() - (cacheData.cachedAt as number) < 30 * 24 * 60 * 60 * 1000) {
        return { details: cacheData.details };
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Google Places key not configured.');

    // Find placeId
    const placeId = await findPlaceId(name, address, apiKey);
    if (!placeId) return { details: null };

    // Fetch details (contact tier includes essentials)
    const details = await getPlaceDetailsAndContact(placeId, apiKey);

    // Track usage: 1 search + 1 contact call + N photos
    await incrementPlacesUsage(db, 'search');
    await incrementPlacesUsage(db, 'contact');
    if (details.photos.length > 0) {
      await incrementPlacesUsage(db, 'photos', details.photos.length);
    }

    // Check cost thresholds (fire-and-forget, don't block response)
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const alertEmail = process.env.EMAIL_CRASH; // reuse crash email for admin alerts
    if (smtpUser && smtpPass && alertEmail) {
      checkAndAlertIfOverThreshold(db, smtpUser, smtpPass, alertEmail).catch(console.error);
      updateFeatureFlags(db, 0).catch(console.error); // will re-read usage internally
    }

    // Cache result
    await cacheRef.set({ details, cachedAt: Date.now() });

    return { details };
  },
);

// ─── Get Place Reviews (Google Places — Atmosphere tier) ──────────────────────
// Called lazily when user taps "See Reviews" in ServiceDetailModal.
// Only fires if atmosphereTierEnabled flag is true.

export const getPlaceReviews = onCall(
  { secrets: ['GOOGLE_PLACES_KEY', 'SLACK_WEBHOOK_URL'] },
  async (request) => {
    if (!request.auth) {
      logSecurityEvent('getPlaceReviews', 'unauthenticated');
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const { placeId } = request.data as { placeId: string };

    // Input validation
    const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
    if (!placeId || typeof placeId !== 'string' || placeId.length > 200 || !ID_PATTERN.test(placeId)) {
      throw new HttpsError('invalid-argument', 'Invalid placeId.');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;

    // Per-user daily rate limit (10 review lookups/day)
    const today = new Date().toISOString().slice(0, 10);
    const usageRef = db.doc(`apiUsage/places_reviews_user_${uid}_${today}`);
    const usageSnap = await usageRef.get();
    const count = (usageSnap.exists ? usageSnap.data()!.count : 0) as number;
    const DAILY_LIMIT = 10;
    if (count >= DAILY_LIMIT) {
      throw new HttpsError('resource-exhausted', 'Daily review lookup limit reached. Try again tomorrow.');
    }
    await usageRef.set({ count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });

    // Feature flag check
    const flagsSnap = await db.doc('appConfig/places').get();
    if (flagsSnap.data()?.atmosphereTierEnabled === false) {
      return { atmosphere: null, flagged: true };
    }

    // 30-day cache
    const cacheKey = `reviews:v1:${placeId}`;
    const cacheRef = db.doc(`serviceCache/${cacheKey}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data()!;
      if (Date.now() - (cacheData.cachedAt as number) < 30 * 24 * 60 * 60 * 1000) {
        return { atmosphere: cacheData.atmosphere };
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Google Places key not configured.');

    const atmosphere = await getPlaceAtmosphere(placeId, apiKey);

    await incrementPlacesUsage(db, 'atmosphere');

    await cacheRef.set({ atmosphere, cachedAt: Date.now() });

    return { atmosphere };
  },
);

// ─── Avatar Token Resolution ──────────────────────────────────────────────────
// Resolves a user's raw avatar Storage URL server-side so it never flows through
// client-facing search results (task-10 privacy compliance).
// The caller must be authenticated. Admin SDK bypasses Firestore client rules.
//
// Returns a signed Firebase Storage URL with 1-hour TTL (Task-20 compliance).
// Falls back to raw URL for base64 data URLs, external auth photo URLs, or emulator.

export const resolveAvatarToken = onCall(
  { secrets: ['SLACK_WEBHOOK_URL'] },
  async (request) => {
    if (!request.auth) {
      logSecurityEvent('resolveAvatarToken', 'unauthenticated');
      throw new HttpsError('unauthenticated', 'Login required.');
    }
    const { uid } = request.data as { uid: string };
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    const snap = await admin.firestore()
      .doc(`users/${uid}/profile/data`)
      .get();
    const avatarUrl: string = snap.data()?.avatarUrl ?? '';

    // If the stored URL is a Firebase Storage HTTPS URL, return a signed URL
    // with a 1-hour TTL so the raw permanent URL never leaves the server.
    if (avatarUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      try {
        const parsed = new URL(avatarUrl);
        const pathMatch = parsed.pathname.match(/\/o\/(.+)$/);
        if (pathMatch) {
          const storagePath = decodeURIComponent(pathMatch[1]);
          const [signedUrl] = await admin.storage().bucket().file(storagePath).getSignedUrl({
            action: 'read',
            expires: Date.now() + 3600000,
          });
          return { url: signedUrl };
        }
      } catch {
        // Fall through to return raw URL if signing fails (e.g. local emulator)
      }
    }

    // Base64 data URLs, Google auth photo URLs, or empty strings are returned as-is.
    return { url: avatarUrl };
  },
);

// ─── Yelp Search + Cache Helper ──────────────────────────────────────────────
// Shared by findServices (user-triggered) and warmYelpCache (scheduled).
// Skips the call if a fresh cache entry already exists (30-day TTL).

async function searchAndCacheYelp(
  lat: number,
  lng: number,
  type: string,
  yelpApiKey: string,
  db: admin.firestore.Firestore,
): Promise<void> {
  const h3Index = latLngToCell(lat, lng, 7);
  const cacheId = `${h3Index}_${type}`;
  const cacheRef = db.doc(`serviceCache/${cacheId}`);
  const cacheSnap = await cacheRef.get();

  if (cacheSnap.exists) {
    const ageMs = Date.now() - ((cacheSnap.data()!.cachedAt as number) ?? 0);
    if (ageMs < 30 * 24 * 60 * 60 * 1000) {
      console.log(`[searchAndCacheYelp] Cache hit for ${cacheId}, skipping Yelp call.`);
      return;
    }
  }

  console.log(`[searchAndCacheYelp] Fetching Yelp — lat=${lat} lng=${lng} type=${type}`);
  const businesses = await findServicesYelp(lat, lng, type, yelpApiKey);

  const serviceIds: string[] = [];
  const batch = db.batch();
  for (const biz of businesses) {
    const serviceId = `yelp_${biz.id}`;
    serviceIds.push(serviceId);
    const serviceRef = db.doc(`services/${serviceId}`);
    const serviceDoc: ServiceDoc = mapYelpToServiceDoc(biz, type, h3Index);
    batch.set(serviceRef, serviceDoc, { merge: true });
  }
  batch.set(cacheRef, { serviceIds, cachedAt: Date.now(), source: 'yelp' });

  const today = new Date().toISOString().slice(0, 10);
  const globalUsageRef = db.doc(`apiUsage/yelp_${today}`);
  batch.set(globalUsageRef, { count: admin.firestore.FieldValue.increment(1) }, { merge: true });

  await batch.commit();
  console.log(`[searchAndCacheYelp] Cached ${businesses.length} businesses for ${cacheId}.`);
}

// ─── Nightly Yelp Cache Warming ───────────────────────────────────────────────
// Reads warming targets from serviceCache/warmingTargets (populated manually).
// Runs at 02:00 UTC each night. Processes at most 10 targets per run to
// control Yelp API costs. Each target that already has a fresh cache entry is
// skipped automatically inside searchAndCacheYelp.
//
// Firestore document shape (serviceCache/warmingTargets):
//   { targets: [{ lat: number, lng: number, type: string }, ...] }
//
// Set the YELP_API_KEY secret before deploying:
//   firebase functions:secrets:set YELP_API_KEY

export const warmYelpCache = onSchedule(
  { schedule: '0 2 * * *', secrets: ['YELP_API_KEY'] },
  async () => {
    const db = admin.firestore();

    const targetsSnap = await db.collection('serviceCache').doc('warmingTargets').get();
    if (!targetsSnap.exists) {
      console.log('[warmYelpCache] No warmingTargets document found — nothing to do.');
      return;
    }

    const targets = (targetsSnap.data()?.targets ?? []) as Array<{ lat: number; lng: number; type: string }>;
    const slice = targets.slice(0, 10); // cap at 10 to control API costs
    console.log(`[warmYelpCache] Starting cache warming for ${slice.length} target(s).`);

    const yelpApiKey = process.env.YELP_API_KEY;
    if (!yelpApiKey) {
      console.error('[warmYelpCache] YELP_API_KEY not configured — aborting.');
      return;
    }

    // Check global daily limit before warming
    const today = new Date().toISOString().slice(0, 10);
    const globalUsageRef = db.doc(`apiUsage/yelp_${today}`);
    const globalUsageSnap = await globalUsageRef.get();
    const currentCount = (globalUsageSnap.data()?.count ?? 0) as number;
    const HARD_LIMIT = 450;
    if (currentCount >= HARD_LIMIT) {
      console.warn(`[warmYelpCache] Daily Yelp limit already reached (${currentCount}/${HARD_LIMIT}). Aborting.`);
      return;
    }

    let warmed = 0;
    let skipped = 0;
    for (const target of slice) {
      try {
        await searchAndCacheYelp(target.lat, target.lng, target.type, yelpApiKey, db);
        warmed++;
      } catch (err) {
        console.error(`[warmYelpCache] Failed for target lat=${target.lat} lng=${target.lng} type=${target.type}:`, err);
        skipped++;
      }
    }

    console.log(`[warmYelpCache] Done. warmed=${warmed} skipped=${skipped}`);
  },
);

// ─── Group Post Expiry Cleanup ────────────────────────────────────────────────
// Deletes group posts older than each group's configured retentionDays (default 365).
// Runs nightly; iterates all groups and processes up to 500 docs per group per run.

export const deleteExpiredGroupPosts = onSchedule('every 24 hours', async () => {
  const db = admin.firestore();
  const groupsSnap = await db.collection('groups').get();
  if (groupsSnap.empty) return;

  await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
    const retentionDays: number = groupDoc.data().retentionDays ?? 365;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const postsSnap = await db
      .collection('groups').doc(groupDoc.id).collection('posts')
      .where('createdAt', '<', cutoff)
      .limit(500)
      .get();
    if (postsSnap.empty) return;
    const batch = db.batch();
    postsSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }));
});

// ─── DM Expiry Cleanup ────────────────────────────────────────────────────────
// Deletes messages whose expiresAt timestamp is in the past (365-day TTL).
// Runs nightly; processes up to 500 docs per invocation (Firestore batch limit).

export const deleteExpiredMessages = onSchedule('every 24 hours', async () => {
  const db = admin.firestore();
  const now = Date.now();
  const snap = await db.collection('messages')
    .where('expiresAt', '<', now)
    .limit(500)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
});

// ─── Monthly Places Cost Alert ────────────────────────────────────────────────
// Runs daily but checks monthly budget — sends alert only if threshold is newly crossed.

export const checkPlacesCostAlert = onSchedule(
  { schedule: 'every 24 hours', secrets: ['SMTP_USER', 'SMTP_PASS', 'EMAIL_CRASH', 'SLACK_WEBHOOK_URL'] },
  async () => {
    const db = admin.firestore();
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const alertEmail = process.env.EMAIL_CRASH;
    if (!smtpUser || !smtpPass || !alertEmail) return;
    await checkAndAlertIfOverThreshold(db, smtpUser, smtpPass, alertEmail);
    const { estimatedCost } = await (await import('./placesUsage')).getPlacesUsageSummary(db);
    await updateFeatureFlags(db, estimatedCost);
  },
);

// ─── GDPR-style Account Data Export ──────────────────────────────────────────
// Collects profile, pets, and sign-in log; uploads JSON to Storage;
// returns a signed download URL valid for 24 hours.

export const exportUserData = onCall(async (request) => {
  if (!request.auth?.uid) {
    logSecurityEvent('exportUserData', 'unauthenticated');
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  return _exportUserData(request.auth.uid);
});

// ─── Vaccine & Medication Reminders ──────────────────────────────────────────
// Runs daily at 09:00 UTC. Scans all pets and checks their vaccines/medications
// arrays for items with a nextDueDate exactly 7 days or 1 day from today.
// For each match, a notification document is created for the pet's owner, which
// the onNotificationCreated trigger will deliver via email and/or FCM push.
//
// Expected Firestore shape for each pet document in the `pets` collection:
//   {
//     ownerId: string,
//     name: string,
//     vaccines?: Array<{ name: string, nextDueDate: string }>,   // YYYY-MM-DD
//     medications?: Array<{ name: string, nextDueDate: string }>, // YYYY-MM-DD
//   }

export const checkVaccineReminders = onSchedule('every day 09:00', async () => {
  const db = admin.firestore();

  // Compute target dates: today + 7 days and today + 1 day (UTC, YYYY-MM-DD)
  const msPerDay = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const toDateString = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
  const in1Day = toDateString(now + 1 * msPerDay);
  const in7Days = toDateString(now + 7 * msPerDay);
  const targetDays: Record<string, number> = { [in1Day]: 1, [in7Days]: 7 };

  console.log(`[checkVaccineReminders] Checking due dates for ${in1Day} (1 day) and ${in7Days} (7 days).`);

  const petsSnap = await db.collection('pets').get();
  if (petsSnap.empty) {
    console.log('[checkVaccineReminders] No pets found — nothing to do.');
    return;
  }

  let reminderCount = 0;

  await Promise.all(petsSnap.docs.map(async (petDoc) => {
    const pet = petDoc.data();
    const uid: string = pet.ownerId;
    const petName: string = pet.name ?? 'your pet';

    if (!uid) return;

    // Check vaccines and medications in a unified loop
    const items: Array<{ name: string; nextDueDate?: string }> = [
      ...(Array.isArray(pet.vaccines) ? pet.vaccines : []),
      ...(Array.isArray(pet.medications) ? pet.medications : []),
    ];

    await Promise.all(items.map(async (item) => {
      if (!item.nextDueDate || !targetDays[item.nextDueDate]) return;
      const daysUntilDue = targetDays[item.nextDueDate];
      try {
        await sendVaccineReminder(uid, petName, item.name ?? 'health item', daysUntilDue);
        reminderCount++;
      } catch (err) {
        console.error(`[checkVaccineReminders] Failed to send reminder for pet=${petDoc.id} uid=${uid}:`, err);
      }
    }));
  }));

  console.log(`[checkVaccineReminders] Done. Sent ${reminderCount} reminder(s).`);
});

// ─── Link Preview ────────────────────────────────────────────────────────────
const linkPreviewLimits = new Map<string, number[]>();

export const fetchLinkPreview = onCall(
  { secrets: [], enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required');
    const url = request.data?.url;
    if (!url || typeof url !== 'string') throw new HttpsError('invalid-argument', 'URL required');

    // Rate limit: 10/min/user
    const uid = request.auth.uid;
    const now = Date.now();
    const userHits = linkPreviewLimits.get(uid) ?? [];
    const recentHits = userHits.filter(t => now - t < 60_000);
    if (recentHits.length >= 10) throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
    recentHits.push(now);
    linkPreviewLimits.set(uid, recentHits);

    const metadata = await fetchOgMetadata(url);
    return metadata ?? { title: '', description: '', image: '', siteName: '', url, fetchedAt: now };
  },
);
