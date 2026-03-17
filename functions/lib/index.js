"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVaccineReminders = exports.exportUserData = exports.checkPlacesCostAlert = exports.deleteExpiredMessages = exports.deleteExpiredGroupPosts = exports.warmYelpCache = exports.resolveAvatarToken = exports.getPlaceReviews = exports.getPlaceDetails = exports.findServices = exports.sendReport = exports.onPostComment = exports.onPostReaction = exports.checkPetBirthdays = exports.sendWeeklyDigest = exports.sendEmailDigest = exports.onNotificationCreated = void 0;
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({ region: 'us-central1', maxInstances: 10 });
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const https = require("https");
const h3_js_1 = require("h3-js");
const yelpService_1 = require("./yelpService");
const exportService_1 = require("./exportService");
const placesService_1 = require("./placesService");
const placesUsage_1 = require("./placesUsage");
const slackService_1 = require("./slackService");
admin.initializeApp();
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "onNotificationCreated", { enumerable: true, get: function () { return notifications_1.onNotificationCreated; } });
Object.defineProperty(exports, "sendEmailDigest", { enumerable: true, get: function () { return notifications_1.sendEmailDigest; } });
Object.defineProperty(exports, "sendWeeklyDigest", { enumerable: true, get: function () { return notifications_1.sendWeeklyDigest; } });
Object.defineProperty(exports, "checkPetBirthdays", { enumerable: true, get: function () { return notifications_1.checkPetBirthdays; } });
Object.defineProperty(exports, "onPostReaction", { enumerable: true, get: function () { return notifications_1.onPostReaction; } });
Object.defineProperty(exports, "onPostComment", { enumerable: true, get: function () { return notifications_1.onPostComment; } });
const notifications_2 = require("./notifications");
exports.sendReport = (0, https_1.onCall)({
    secrets: ['SMTP_USER', 'SMTP_PASS', 'EMAIL_CRASH', 'EMAIL_BUG', 'EMAIL_FEEDBACK', 'SLACK_WEBHOOK_URL'],
}, async (request) => {
    var _a;
    const data = request.data;
    if (!data.type || !['crash', 'bug', 'feedback'].includes(data.type)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid report type.');
    }
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpUser || !smtpPass) {
        throw new https_1.HttpsError('failed-precondition', 'Email transport not configured.');
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
    });
    const destination = (() => {
        switch (data.type) {
            case 'crash': return process.env.EMAIL_CRASH;
            case 'bug': return process.env.EMAIL_BUG;
            case 'feedback': return process.env.EMAIL_FEEDBACK;
        }
    })();
    if (!destination) {
        throw new https_1.HttpsError('failed-precondition', 'Destination email not configured.');
    }
    const subject = (() => {
        var _a, _b, _c;
        switch (data.type) {
            case 'crash': return `[PetBase] Crash Report — ${(_a = data.errorId) !== null && _a !== void 0 ? _a : 'unknown'}`;
            case 'bug': return `[PetBase] Bug Report from ${(_b = data.userEmail) !== null && _b !== void 0 ? _b : 'anonymous'}`;
            case 'feedback': return `[PetBase] Feedback from ${(_c = data.userEmail) !== null && _c !== void 0 ? _c : 'anonymous'}`;
        }
    })();
    const body = [
        `Type: ${data.type}`,
        `From: ${(_a = data.userEmail) !== null && _a !== void 0 ? _a : 'anonymous'}`,
        data.errorId ? `Error ID: ${data.errorId}` : null,
        '',
        data.message ? `Message:\n${data.message}` : null,
        '',
        data.log ? `--- Diagnostic Log (last 7 days) ---\n${data.log}` : null,
    ]
        .filter(Boolean)
        .join('\n');
    await transporter.sendMail({
        from: smtpUser,
        to: destination,
        subject,
        text: body,
    });
    // Post to Slack for crash and bug reports (not feedback)
    if (data.type !== 'feedback') {
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhookUrl) {
            const level = data.type === 'crash' ? 'error' : 'warn';
            const slackBody = [
                data.errorId ? `*Error ID:* ${data.errorId}` : null,
                data.message ? `*Message:* ${data.message.slice(0, 500)}` : null,
                data.log ? `*Log (truncated):*\n\`\`\`${data.log.slice(0, 1000)}\`\`\`` : null,
            ].filter(Boolean).join('\n') || 'No additional details.';
            (0, slackService_1.postSlackBlocks)(slackWebhookUrl, (0, slackService_1.buildAlertBlock)(subject, slackBody, level))
                .catch(() => { });
        }
    }
    return { success: true };
});
// ─── Security Event Logging ───────────────────────────────────────────────────
/**
 * Fire-and-forget Slack alert for auth/security rejections.
 * Called before throwing HttpsError('unauthenticated') or ('permission-denied').
 */
function logSecurityEvent(functionName, code, uid) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl)
        return;
    const detail = [
        `*Code:* \`${code}\``,
        uid ? `*UID attempt:* ${uid}` : null,
        `*Function:* ${functionName}`,
    ].filter(Boolean).join('\n');
    (0, slackService_1.postSlackBlocks)(webhookUrl, (0, slackService_1.buildAlertBlock)(`Security Event — ${functionName}`, detail, 'warn'))
        .catch(() => { });
}
function fetchJson(url, headers) {
    return new Promise((resolve, reject) => {
        const options = headers ? { headers } : {};
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}
function mapYelpToServiceDoc(biz, category, h3Index) {
    var _a;
    return {
        name: biz.name,
        category,
        address: biz.location.display_address.join(', '),
        lat: biz.coordinates.latitude,
        lng: biz.coordinates.longitude,
        h3Index,
        phone: (_a = biz.phone) !== null && _a !== void 0 ? _a : '',
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
    };
}
function mapToServiceResult(docs) {
    return [...docs]
        .sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0) || b.rating - a.rating)
        .map(d => {
        var _a;
        return ({
            id: d.id,
            name: d.name,
            type: d.category,
            rating: d.rating,
            reviews: d.reviewCount,
            distance: '',
            address: d.address,
            image: (_a = d.photos[0]) !== null && _a !== void 0 ? _a : '',
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
        });
    });
}
exports.findServices = (0, https_1.onCall)({ secrets: ['GOOGLE_PLACES_KEY', 'YELP_API_KEY'] }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    // ── Per-user daily rate limit ──────────────────────────────────────────────
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        logSecurityEvent('findServices', 'unauthenticated');
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const db = admin.firestore();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const usageRef = db.doc(`apiUsage/yelp/perUser/${uid}/${today}`);
    const usageSnap = await usageRef.get();
    const count = (usageSnap.exists ? usageSnap.data().count : 0);
    const DAILY_LIMIT = 5;
    if (count >= DAILY_LIMIT) {
        throw new https_1.HttpsError('resource-exhausted', 'Daily search limit reached. Try again tomorrow.');
    }
    await usageRef.set({ count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });
    // ──────────────────────────────────────────────────────────────────────────
    const { type, location, query } = request.data;
    let { lat, lng } = request.data;
    console.log(`[findServices] invoked — type=${type} location=${location} lat=${lat} lng=${lng} query=${query !== null && query !== void 0 ? query : ''} uid=${uid}`);
    const HARD_LIMIT = 450;
    const WARN_THRESHOLD = 400;
    // Global daily rate limit check — path is 2 segments: collection "apiUsage", document "yelp_YYYY-MM-DD"
    const globalUsageRef = db.doc(`apiUsage/yelp_${today}`);
    const globalUsageSnap = await globalUsageRef.get();
    const currentCount = ((_c = (_b = globalUsageSnap.data()) === null || _b === void 0 ? void 0 : _b.count) !== null && _c !== void 0 ? _c : 0);
    console.log(`[findServices] Yelp daily usage: ${currentCount}/${HARD_LIMIT}`);
    // Resolve coordinates if not provided (ZIP-based search)
    if (lat == null || lng == null) {
        const googleKey = process.env.GOOGLE_PLACES_KEY;
        if (!googleKey)
            throw new https_1.HttpsError('failed-precondition', 'Google key not configured.');
        console.log(`[findServices] Geocoding location: "${location}"`);
        const geoData = await fetchJson(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleKey}`);
        console.log(`[findServices] Geocode status: ${geoData.status} — result count: ${(_e = (_d = geoData.results) === null || _d === void 0 ? void 0 : _d.length) !== null && _e !== void 0 ? _e : 0}`);
        const loc = (_h = (_g = (_f = geoData.results) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.geometry) === null || _h === void 0 ? void 0 : _h.location;
        if (!loc)
            throw new https_1.HttpsError('not-found', 'Could not geocode location.');
        lat = loc.lat;
        lng = loc.lng;
    }
    console.log(`[findServices] Resolved coords — lat=${lat} lng=${lng}`);
    // H3 index at resolution 7 (~5km)
    const h3Index = (0, h3_js_1.latLngToCell)(lat, lng, 7);
    const cacheId = `${h3Index}_${type}`;
    // Check serviceCache (TTL 7 days)
    const cacheRef = db.doc(`serviceCache/${cacheId}`);
    const cacheSnap = await cacheRef.get();
    console.log(`[findServices] H3 cache key: ${cacheId} — exists: ${cacheSnap.exists}`);
    if (cacheSnap.exists) {
        const cacheData = cacheSnap.data();
        const ageMs = Date.now() - ((_j = cacheData.cachedAt) !== null && _j !== void 0 ? _j : 0);
        if (ageMs < 30 * 24 * 60 * 60 * 1000) {
            const serviceIds = (_k = cacheData.serviceIds) !== null && _k !== void 0 ? _k : [];
            const serviceDocs = await Promise.all(serviceIds.map(id => db.doc(`services/${id}`).get()));
            const results = serviceDocs
                .filter(d => d.exists)
                .map(d => (Object.assign({ id: d.id }, d.data())));
            return { results: mapToServiceResult(results) };
        }
    }
    // Hard limit — return empty rather than error
    if (currentCount >= HARD_LIMIT) {
        console.warn(`Yelp daily limit reached (${currentCount}/${HARD_LIMIT}). Returning empty.`);
        return { results: [] };
    }
    // Fetch from Yelp
    const yelpApiKey = process.env.YELP_API_KEY;
    if (!yelpApiKey)
        throw new https_1.HttpsError('failed-precondition', 'Yelp API key not configured.');
    console.log(`[findServices] Calling Yelp API — category=${type} lat=${lat} lng=${lng}`);
    const businesses = await (0, yelpService_1.findServicesYelp)(lat, lng, type, yelpApiKey, query);
    console.log(`[findServices] Yelp returned ${businesses.length} businesses`);
    // Persist and cache
    const serviceIds = [];
    const batch = db.batch();
    for (const biz of businesses) {
        const serviceId = `yelp_${biz.id}`;
        serviceIds.push(serviceId);
        const serviceRef = db.doc(`services/${serviceId}`);
        const serviceDoc = mapYelpToServiceDoc(biz, type, h3Index);
        batch.set(serviceRef, serviceDoc, { merge: true });
    }
    batch.set(cacheRef, { serviceIds, cachedAt: Date.now(), source: 'yelp' });
    batch.set(globalUsageRef, { count: admin.firestore.FieldValue.increment(1) }, { merge: true });
    await batch.commit();
    if (currentCount + 1 > WARN_THRESHOLD) {
        console.warn(`Yelp API warning: ${currentCount + 1}/${HARD_LIMIT} calls today.`);
    }
    const allDocs = businesses.map(biz => (Object.assign({ id: `yelp_${biz.id}` }, mapYelpToServiceDoc(biz, type, h3Index))));
    return { results: mapToServiceResult(allDocs) };
});
// ─── Get Place Details (Google Places — Essentials + Contact tier) ────────────
// Called when user opens a ServiceDetailModal.
// Checks feature flag, uses 30-day Firestore cache, increments usage counters.
exports.getPlaceDetails = (0, https_1.onCall)({ secrets: ['GOOGLE_PLACES_KEY', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_CRASH', 'SLACK_WEBHOOK_URL'] }, async (request) => {
    var _a;
    const { serviceId, name, address } = request.data;
    const db = admin.firestore();
    // Feature flag check
    const flagsSnap = await db.doc('appConfig/places').get();
    const flags = (_a = flagsSnap.data()) !== null && _a !== void 0 ? _a : {};
    if (flags.contactTierEnabled === false) {
        return { details: null, flagged: true };
    }
    // 30-day cache check
    const cacheKey = `details:essentials+contact:v1:${serviceId}`;
    const cacheRef = db.doc(`serviceCache/${cacheKey}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
        const cacheData = cacheSnap.data();
        if (Date.now() - cacheData.cachedAt < 30 * 24 * 60 * 60 * 1000) {
            return { details: cacheData.details };
        }
    }
    const apiKey = process.env.GOOGLE_PLACES_KEY;
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'Google Places key not configured.');
    // Find placeId
    const placeId = await (0, placesService_1.findPlaceId)(name, address, apiKey);
    if (!placeId)
        return { details: null };
    // Fetch details (contact tier includes essentials)
    const details = await (0, placesService_1.getPlaceDetailsAndContact)(placeId, apiKey);
    // Track usage: 1 search + 1 contact call + N photos
    await (0, placesUsage_1.incrementPlacesUsage)(db, 'search');
    await (0, placesUsage_1.incrementPlacesUsage)(db, 'contact');
    if (details.photos.length > 0) {
        await (0, placesUsage_1.incrementPlacesUsage)(db, 'photos', details.photos.length);
    }
    // Check cost thresholds (fire-and-forget, don't block response)
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const alertEmail = process.env.EMAIL_CRASH; // reuse crash email for admin alerts
    if (smtpUser && smtpPass && alertEmail) {
        (0, placesUsage_1.checkAndAlertIfOverThreshold)(db, smtpUser, smtpPass, alertEmail).catch(console.error);
        (0, placesUsage_1.updateFeatureFlags)(db, 0).catch(console.error); // will re-read usage internally
    }
    // Cache result
    await cacheRef.set({ details, cachedAt: Date.now() });
    return { details };
});
// ─── Get Place Reviews (Google Places — Atmosphere tier) ──────────────────────
// Called lazily when user taps "See Reviews" in ServiceDetailModal.
// Only fires if atmosphereTierEnabled flag is true.
exports.getPlaceReviews = (0, https_1.onCall)({ secrets: ['GOOGLE_PLACES_KEY', 'SLACK_WEBHOOK_URL'] }, async (request) => {
    var _a;
    const { placeId } = request.data;
    const db = admin.firestore();
    // Feature flag check
    const flagsSnap = await db.doc('appConfig/places').get();
    if (((_a = flagsSnap.data()) === null || _a === void 0 ? void 0 : _a.atmosphereTierEnabled) === false) {
        return { atmosphere: null, flagged: true };
    }
    // 30-day cache
    const cacheKey = `reviews:v1:${placeId}`;
    const cacheRef = db.doc(`serviceCache/${cacheKey}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
        const cacheData = cacheSnap.data();
        if (Date.now() - cacheData.cachedAt < 30 * 24 * 60 * 60 * 1000) {
            return { atmosphere: cacheData.atmosphere };
        }
    }
    const apiKey = process.env.GOOGLE_PLACES_KEY;
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'Google Places key not configured.');
    const atmosphere = await (0, placesService_1.getPlaceAtmosphere)(placeId, apiKey);
    await (0, placesUsage_1.incrementPlacesUsage)(db, 'atmosphere');
    await cacheRef.set({ atmosphere, cachedAt: Date.now() });
    return { atmosphere };
});
// ─── Avatar Token Resolution ──────────────────────────────────────────────────
// Resolves a user's raw avatar Storage URL server-side so it never flows through
// client-facing search results (task-10 privacy compliance).
// The caller must be authenticated. Admin SDK bypasses Firestore client rules.
//
// Returns a signed Firebase Storage URL with 1-hour TTL (Task-20 compliance).
// Falls back to raw URL for base64 data URLs, external auth photo URLs, or emulator.
exports.resolveAvatarToken = (0, https_1.onCall)({ secrets: ['SLACK_WEBHOOK_URL'] }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        logSecurityEvent('resolveAvatarToken', 'unauthenticated');
        throw new https_1.HttpsError('unauthenticated', 'Login required.');
    }
    const { uid } = request.data;
    if (!uid || typeof uid !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'uid is required.');
    }
    const snap = await admin.firestore()
        .doc(`users/${uid}/profile/data`)
        .get();
    const avatarUrl = (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.avatarUrl) !== null && _b !== void 0 ? _b : '';
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
        }
        catch (_c) {
            // Fall through to return raw URL if signing fails (e.g. local emulator)
        }
    }
    // Base64 data URLs, Google auth photo URLs, or empty strings are returned as-is.
    return { url: avatarUrl };
});
// ─── Yelp Search + Cache Helper ──────────────────────────────────────────────
// Shared by findServices (user-triggered) and warmYelpCache (scheduled).
// Skips the call if a fresh cache entry already exists (30-day TTL).
async function searchAndCacheYelp(lat, lng, type, yelpApiKey, db) {
    var _a;
    const h3Index = (0, h3_js_1.latLngToCell)(lat, lng, 7);
    const cacheId = `${h3Index}_${type}`;
    const cacheRef = db.doc(`serviceCache/${cacheId}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
        const ageMs = Date.now() - ((_a = cacheSnap.data().cachedAt) !== null && _a !== void 0 ? _a : 0);
        if (ageMs < 30 * 24 * 60 * 60 * 1000) {
            console.log(`[searchAndCacheYelp] Cache hit for ${cacheId}, skipping Yelp call.`);
            return;
        }
    }
    console.log(`[searchAndCacheYelp] Fetching Yelp — lat=${lat} lng=${lng} type=${type}`);
    const businesses = await (0, yelpService_1.findServicesYelp)(lat, lng, type, yelpApiKey);
    const serviceIds = [];
    const batch = db.batch();
    for (const biz of businesses) {
        const serviceId = `yelp_${biz.id}`;
        serviceIds.push(serviceId);
        const serviceRef = db.doc(`services/${serviceId}`);
        const serviceDoc = mapYelpToServiceDoc(biz, type, h3Index);
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
exports.warmYelpCache = (0, scheduler_1.onSchedule)({ schedule: '0 2 * * *', secrets: ['YELP_API_KEY'] }, async () => {
    var _a, _b, _c, _d;
    const db = admin.firestore();
    const targetsSnap = await db.collection('serviceCache').doc('warmingTargets').get();
    if (!targetsSnap.exists) {
        console.log('[warmYelpCache] No warmingTargets document found — nothing to do.');
        return;
    }
    const targets = ((_b = (_a = targetsSnap.data()) === null || _a === void 0 ? void 0 : _a.targets) !== null && _b !== void 0 ? _b : []);
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
    const currentCount = ((_d = (_c = globalUsageSnap.data()) === null || _c === void 0 ? void 0 : _c.count) !== null && _d !== void 0 ? _d : 0);
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
        }
        catch (err) {
            console.error(`[warmYelpCache] Failed for target lat=${target.lat} lng=${target.lng} type=${target.type}:`, err);
            skipped++;
        }
    }
    console.log(`[warmYelpCache] Done. warmed=${warmed} skipped=${skipped}`);
});
// ─── Group Post Expiry Cleanup ────────────────────────────────────────────────
// Deletes group posts older than each group's configured retentionDays (default 365).
// Runs nightly; iterates all groups and processes up to 500 docs per group per run.
exports.deleteExpiredGroupPosts = (0, scheduler_1.onSchedule)('every 24 hours', async () => {
    const db = admin.firestore();
    const groupsSnap = await db.collection('groups').get();
    if (groupsSnap.empty)
        return;
    await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
        var _a;
        const retentionDays = (_a = groupDoc.data().retentionDays) !== null && _a !== void 0 ? _a : 365;
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const postsSnap = await db
            .collection('groups').doc(groupDoc.id).collection('posts')
            .where('createdAt', '<', cutoff)
            .limit(500)
            .get();
        if (postsSnap.empty)
            return;
        const batch = db.batch();
        postsSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }));
});
// ─── DM Expiry Cleanup ────────────────────────────────────────────────────────
// Deletes messages whose expiresAt timestamp is in the past (365-day TTL).
// Runs nightly; processes up to 500 docs per invocation (Firestore batch limit).
exports.deleteExpiredMessages = (0, scheduler_1.onSchedule)('every 24 hours', async () => {
    const db = admin.firestore();
    const now = Date.now();
    const snap = await db.collection('messages')
        .where('expiresAt', '<', now)
        .limit(500)
        .get();
    if (snap.empty)
        return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
});
// ─── Monthly Places Cost Alert ────────────────────────────────────────────────
// Runs daily but checks monthly budget — sends alert only if threshold is newly crossed.
exports.checkPlacesCostAlert = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours', secrets: ['SMTP_USER', 'SMTP_PASS', 'EMAIL_CRASH', 'SLACK_WEBHOOK_URL'] }, async () => {
    const db = admin.firestore();
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const alertEmail = process.env.EMAIL_CRASH;
    if (!smtpUser || !smtpPass || !alertEmail)
        return;
    await (0, placesUsage_1.checkAndAlertIfOverThreshold)(db, smtpUser, smtpPass, alertEmail);
    const { estimatedCost } = await (await Promise.resolve().then(() => require('./placesUsage'))).getPlacesUsageSummary(db);
    await (0, placesUsage_1.updateFeatureFlags)(db, estimatedCost);
});
// ─── GDPR-style Account Data Export ──────────────────────────────────────────
// Collects profile, pets, and sign-in log; uploads JSON to Storage;
// returns a signed download URL valid for 24 hours.
exports.exportUserData = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        logSecurityEvent('exportUserData', 'unauthenticated');
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    return (0, exportService_1.exportUserData)(request.auth.uid);
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
exports.checkVaccineReminders = (0, scheduler_1.onSchedule)('every day 09:00', async () => {
    const db = admin.firestore();
    // Compute target dates: today + 7 days and today + 1 day (UTC, YYYY-MM-DD)
    const msPerDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const toDateString = (ms) => new Date(ms).toISOString().slice(0, 10);
    const in1Day = toDateString(now + 1 * msPerDay);
    const in7Days = toDateString(now + 7 * msPerDay);
    const targetDays = { [in1Day]: 1, [in7Days]: 7 };
    console.log(`[checkVaccineReminders] Checking due dates for ${in1Day} (1 day) and ${in7Days} (7 days).`);
    const petsSnap = await db.collection('pets').get();
    if (petsSnap.empty) {
        console.log('[checkVaccineReminders] No pets found — nothing to do.');
        return;
    }
    let reminderCount = 0;
    await Promise.all(petsSnap.docs.map(async (petDoc) => {
        var _a;
        const pet = petDoc.data();
        const uid = pet.ownerId;
        const petName = (_a = pet.name) !== null && _a !== void 0 ? _a : 'your pet';
        if (!uid)
            return;
        // Check vaccines and medications in a unified loop
        const items = [
            ...(Array.isArray(pet.vaccines) ? pet.vaccines : []),
            ...(Array.isArray(pet.medications) ? pet.medications : []),
        ];
        await Promise.all(items.map(async (item) => {
            var _a;
            if (!item.nextDueDate || !targetDays[item.nextDueDate])
                return;
            const daysUntilDue = targetDays[item.nextDueDate];
            try {
                await (0, notifications_2.sendVaccineReminder)(uid, petName, (_a = item.name) !== null && _a !== void 0 ? _a : 'health item', daysUntilDue);
                reminderCount++;
            }
            catch (err) {
                console.error(`[checkVaccineReminders] Failed to send reminder for pet=${petDoc.id} uid=${uid}:`, err);
            }
        }));
    }));
    console.log(`[checkVaccineReminders] Done. Sent ${reminderCount} reminder(s).`);
});
//# sourceMappingURL=index.js.map