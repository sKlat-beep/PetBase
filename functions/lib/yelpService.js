"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YELP_CATEGORY_MAP = void 0;
exports.findServicesYelp = findServicesYelp;
const https = require("https");
exports.YELP_CATEGORY_MAP = {
    Vets: 'vets',
    Groomers: 'petgroomers',
    Sitters: 'petsitting',
    Walkers: 'dogwalkers',
    Trainers: 'pettraining',
    Stores: 'petstore',
    Boarding: 'dogboarding',
    Shelters: 'animalshelters',
};
function fetchYelp(url, apiKey) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { Authorization: `Bearer ${apiKey}` } }, (res) => {
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
    });
}
async function findServicesYelp(lat, lng, category, apiKey, query) {
    var _a, _b;
    const yelpCategory = (_a = exports.YELP_CATEGORY_MAP[category]) !== null && _a !== void 0 ? _a : 'petstore';
    const params = new URLSearchParams(Object.assign({ latitude: String(lat), longitude: String(lng), categories: yelpCategory, limit: '50', radius: '8000', sort_by: 'rating' }, (query ? { term: query } : {})));
    const data = await fetchYelp(`https://api.yelp.com/v3/businesses/search?${params.toString()}`, apiKey);
    return (_b = data.businesses) !== null && _b !== void 0 ? _b : [];
}
//# sourceMappingURL=yelpService.js.map