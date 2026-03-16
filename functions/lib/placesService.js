"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPlaceId = findPlaceId;
exports.resolvePhotoUrl = resolvePhotoUrl;
exports.getPlaceDetailsAndContact = getPlaceDetailsAndContact;
exports.getPlaceAtmosphere = getPlaceAtmosphere;
const https = require("https");
const logger_1 = require("./logger");
const log = (0, logger_1.createLogger)('placesService');
// ─── Helpers ─────────────────────────────────────────────────────────────────
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
function postJson(url, body, headers) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, headers),
        };
        const req = https.request(options, (res) => {
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
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}
// ─── API Functions ────────────────────────────────────────────────────────────
/**
 * Find a Place ID using Text Search (New).
 * Returns the first matching place's ID, or null if not found.
 */
async function findPlaceId(name, address, apiKey) {
    var _a, _b, _c;
    try {
        const result = await postJson('https://places.googleapis.com/v1/places:searchText', { textQuery: `${name} ${address}`, maxResultCount: 1 }, {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id',
        });
        return (_c = (_b = (_a = result === null || result === void 0 ? void 0 : result.places) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
    }
    catch (err) {
        log.error('findPlaceId error', err);
        return null;
    }
}
/**
 * Resolve a photo resource name to a CDN URL via the Photos (New) media endpoint.
 * Returns null on any failure so callers can continue with other photos.
 */
async function resolvePhotoUrl(photoName, apiKey, maxWidthPx = 800) {
    var _a;
    try {
        const result = await fetchJson(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${apiKey}`);
        return (_a = result === null || result === void 0 ? void 0 : result.photoUri) !== null && _a !== void 0 ? _a : null;
    }
    catch (err) {
        log.error('resolvePhotoUrl error', err);
        return null;
    }
}
/**
 * Fetch essentials + contact-tier details for a place.
 * Resolves up to 5 photo URLs via Promise.allSettled (failures are silently dropped).
 */
async function getPlaceDetailsAndContact(placeId, apiKey) {
    var _a, _b, _c, _d;
    try {
        const result = await fetchJson(`https://places.googleapis.com/v1/places/${placeId}`, {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,googleMapsUri,photos',
        });
        const rawPhotos = (_a = result === null || result === void 0 ? void 0 : result.photos) !== null && _a !== void 0 ? _a : [];
        const first5 = rawPhotos.slice(0, 5);
        const photoResults = await Promise.allSettled(first5.map((p) => resolvePhotoUrl(p.name, apiKey)));
        const photos = photoResults
            .filter((r) => r.status === 'fulfilled' && r.value !== null)
            .map((r) => r.value);
        return {
            placeId: (_b = result === null || result === void 0 ? void 0 : result.id) !== null && _b !== void 0 ? _b : placeId,
            name: (_d = (_c = result === null || result === void 0 ? void 0 : result.displayName) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '',
            formattedAddress: result === null || result === void 0 ? void 0 : result.formattedAddress,
            phone: result === null || result === void 0 ? void 0 : result.nationalPhoneNumber,
            website: result === null || result === void 0 ? void 0 : result.websiteUri,
            googleMapsUri: result === null || result === void 0 ? void 0 : result.googleMapsUri,
            photos,
        };
    }
    catch (err) {
        log.error('getPlaceDetailsAndContact error', err);
        return { placeId, name: '', photos: [] };
    }
}
/**
 * Fetch atmosphere-tier data (reviews + price level) for a place.
 * Reviews with no text are filtered out.
 */
async function getPlaceAtmosphere(placeId, apiKey) {
    var _a;
    try {
        const result = await fetchJson(`https://places.googleapis.com/v1/places/${placeId}`, {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'reviews,priceLevel',
        });
        const rawReviews = (_a = result === null || result === void 0 ? void 0 : result.reviews) !== null && _a !== void 0 ? _a : [];
        const reviews = rawReviews
            .filter((r) => { var _a; return (_a = r === null || r === void 0 ? void 0 : r.text) === null || _a === void 0 ? void 0 : _a.text; })
            .map((r) => {
            var _a, _b, _c, _d, _e;
            return ({
                authorName: (_b = (_a = r.authorAttribution) === null || _a === void 0 ? void 0 : _a.displayName) !== null && _b !== void 0 ? _b : '',
                rating: (_c = r.rating) !== null && _c !== void 0 ? _c : 0,
                text: (_d = r.text) === null || _d === void 0 ? void 0 : _d.text,
                relativePublishTimeDescription: (_e = r.relativePublishTimeDescription) !== null && _e !== void 0 ? _e : '',
            });
        });
        return {
            reviews,
            priceLevel: result === null || result === void 0 ? void 0 : result.priceLevel,
        };
    }
    catch (err) {
        log.error('getPlaceAtmosphere error', err);
        return { reviews: [] };
    }
}
//# sourceMappingURL=placesService.js.map