"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementPlacesUsage = incrementPlacesUsage;
exports.getPlacesUsageSummary = getPlacesUsageSummary;
exports.checkAndAlertIfOverThreshold = checkAndAlertIfOverThreshold;
exports.updateFeatureFlags = updateFeatureFlags;
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const slackService_1 = require("./slackService");
// ─── Constants ───────────────────────────────────────────────────────────────
const COST_PER_CALL = {
    search: 0.032, // Text Search
    contact: 0.007, // Place Details with Contact fields (includes essentials)
    atmosphere: 0.013, // Place Details with Atmosphere fields
    photos: 0.007, // Photo URL resolution (per photo)
};
const MONTHLY_BUDGET = 200; // USD
const ALERT_THRESHOLDS = [0.50, 0.75, 0.90, 1.00];
// ─── Usage Tracking ───────────────────────────────────────────────────────────
/**
 * Increment the usage counter for a given tier in the current month's document.
 * Document path: apiUsage/google_{YYYY-MM}  (2-segment path: collection/document)
 */
async function incrementPlacesUsage(db, tier, count = 1) {
    const monthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-03"
    const ref = db.doc(`apiUsage/google_${monthKey}`);
    await ref.set({ [`${tier}Count`]: admin.firestore.FieldValue.increment(count) }, { merge: true });
}
/**
 * Read the current month's usage and compute estimated cost.
 */
async function getPlacesUsageSummary(db) {
    var _a, _b, _c, _d, _e;
    const monthKey = new Date().toISOString().slice(0, 7);
    const snap = await db.doc(`apiUsage/google_${monthKey}`).get();
    const data = (_a = snap.data()) !== null && _a !== void 0 ? _a : {};
    const counts = {
        search: (_b = data['searchCount']) !== null && _b !== void 0 ? _b : 0,
        contact: (_c = data['contactCount']) !== null && _c !== void 0 ? _c : 0,
        atmosphere: (_d = data['atmosphereCount']) !== null && _d !== void 0 ? _d : 0,
        photos: (_e = data['photosCount']) !== null && _e !== void 0 ? _e : 0,
    };
    const estimatedCost = counts.search * COST_PER_CALL.search +
        counts.contact * COST_PER_CALL.contact +
        counts.atmosphere * COST_PER_CALL.atmosphere +
        counts.photos * COST_PER_CALL.photos;
    return { monthKey, estimatedCost, counts };
}
// ─── Alerting ─────────────────────────────────────────────────────────────────
/**
 * Check current usage against ALERT_THRESHOLDS. If a new threshold has been
 * crossed (not previously alerted), send email and a Slack block.
 * Reads SLACK_WEBHOOK_URL from process.env (Firebase Secret).
 */
async function checkAndAlertIfOverThreshold(db, smtpUser, smtpPass, alertEmail) {
    var _a, _b;
    const summary = await getPlacesUsageSummary(db);
    const { monthKey, estimatedCost, counts } = summary;
    const pct = estimatedCost / MONTHLY_BUDGET;
    // Determine the highest threshold crossed
    const crossedThreshold = ALERT_THRESHOLDS.filter((t) => pct >= t).pop();
    if (crossedThreshold === undefined)
        return;
    // Check if this threshold alert has already been sent
    const alertsRef = db.doc(`apiUsage/google_${monthKey}`);
    const alertsSnap = await alertsRef.get();
    const alertsSent = (_b = (_a = alertsSnap.data()) === null || _a === void 0 ? void 0 : _a.alertsSent) !== null && _b !== void 0 ? _b : [];
    if (alertsSent.includes(crossedThreshold))
        return;
    // Build message body
    const pctDisplay = Math.round(pct * 100);
    const tierLines = Object.keys(COST_PER_CALL).map((tier) => {
        const c = counts[tier];
        const cost = (c * COST_PER_CALL[tier]).toFixed(4);
        return `  ${tier.padEnd(12)} ${String(c).padStart(6)} calls   $${cost}`;
    });
    const body = [
        `Google Places API Cost Alert — ${pctDisplay}% of monthly budget`,
        '',
        `Month:          ${monthKey}`,
        `Estimated cost: $${estimatedCost.toFixed(2)} / $${MONTHLY_BUDGET.toFixed(2)} budget`,
        '',
        'Breakdown:',
        ...tierLines,
        '',
        'Action may be required if usage continues at this rate.',
    ].join('\n');
    const subject = `[PetBase] Google Places API cost alert — ${pctDisplay}% of budget`;
    // Send email
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
            from: smtpUser,
            to: alertEmail,
            subject,
            text: body,
        });
        console.log(`checkAndAlertIfOverThreshold: email sent (${pctDisplay}%)`);
    }
    catch (err) {
        console.error('checkAndAlertIfOverThreshold: email send failed', err);
    }
    // Send Slack if configured
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
        try {
            const level = crossedThreshold >= 1.0 ? 'error' : crossedThreshold >= 0.75 ? 'warn' : 'info';
            await (0, slackService_1.postSlackBlocks)(slackWebhookUrl, (0, slackService_1.buildAlertBlock)(subject, body, level));
            console.log('checkAndAlertIfOverThreshold: Slack notification sent');
        }
        catch (err) {
            console.error('checkAndAlertIfOverThreshold: Slack notification failed', err);
        }
    }
    // Record that this threshold was alerted
    await alertsRef.set({ alertsSent: admin.firestore.FieldValue.arrayUnion(crossedThreshold) }, { merge: true });
}
// ─── Feature Flag Management ──────────────────────────────────────────────────
/**
 * Disable feature flags based on current estimated spend.
 * Flags are never re-enabled automatically — that's a manual safety measure.
 */
async function updateFeatureFlags(db, estimatedCost) {
    if (estimatedCost >= MONTHLY_BUDGET) {
        await db.doc('appConfig/places').set({ contactTierEnabled: false, atmosphereTierEnabled: false }, { merge: true });
        console.warn('updateFeatureFlags: budget 100%+ — disabled both Places tiers');
    }
    else if (estimatedCost >= MONTHLY_BUDGET * 0.9) {
        await db.doc('appConfig/places').set({ atmosphereTierEnabled: false }, { merge: true });
        console.warn('updateFeatureFlags: budget 90%+ — disabled atmosphere tier');
    }
    // No automatic re-enable
}
//# sourceMappingURL=placesUsage.js.map