import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { postSlackBlocks, buildAlertBlock } from './slackService';
import { createLogger } from './logger';

const log = createLogger('placesUsage');

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlacesTier = 'search' | 'contact' | 'atmosphere' | 'photos';

// ─── Constants ───────────────────────────────────────────────────────────────

const COST_PER_CALL: Record<PlacesTier, number> = {
  search: 0.032,      // Text Search
  contact: 0.007,     // Place Details with Contact fields (includes essentials)
  atmosphere: 0.013,  // Place Details with Atmosphere fields
  photos: 0.007,      // Photo URL resolution (per photo)
};

const MONTHLY_BUDGET = 200; // USD
const ALERT_THRESHOLDS = [0.50, 0.75, 0.90, 1.00];

// ─── Usage Tracking ───────────────────────────────────────────────────────────

/**
 * Increment the usage counter for a given tier in the current month's document.
 * Document path: apiUsage/google_{YYYY-MM}  (2-segment path: collection/document)
 */
export async function incrementPlacesUsage(
  db: admin.firestore.Firestore,
  tier: PlacesTier,
  count: number = 1,
): Promise<void> {
  const monthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-03"
  const ref = db.doc(`apiUsage/google_${monthKey}`);
  await ref.set(
    { [`${tier}Count`]: admin.firestore.FieldValue.increment(count) },
    { merge: true },
  );
}

/**
 * Read the current month's usage and compute estimated cost.
 */
export async function getPlacesUsageSummary(
  db: admin.firestore.Firestore,
): Promise<{ monthKey: string; estimatedCost: number; counts: Record<PlacesTier, number> }> {
  const monthKey = new Date().toISOString().slice(0, 7);
  const snap = await db.doc(`apiUsage/google_${monthKey}`).get();
  const data = snap.data() ?? {};

  const counts: Record<PlacesTier, number> = {
    search: (data['searchCount'] as number) ?? 0,
    contact: (data['contactCount'] as number) ?? 0,
    atmosphere: (data['atmosphereCount'] as number) ?? 0,
    photos: (data['photosCount'] as number) ?? 0,
  };

  const estimatedCost =
    counts.search * COST_PER_CALL.search +
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
export async function checkAndAlertIfOverThreshold(
  db: admin.firestore.Firestore,
  smtpUser: string,
  smtpPass: string,
  alertEmail: string,
): Promise<void> {
  const summary = await getPlacesUsageSummary(db);
  const { monthKey, estimatedCost, counts } = summary;

  const pct = estimatedCost / MONTHLY_BUDGET;

  // Determine the highest threshold crossed
  const crossedThreshold = ALERT_THRESHOLDS.filter((t) => pct >= t).pop();
  if (crossedThreshold === undefined) return;

  // Check if this threshold alert has already been sent
  const alertsRef = db.doc(`apiUsage/google_${monthKey}`);
  const alertsSnap = await alertsRef.get();
  const alertsSent: number[] = (alertsSnap.data()?.alertsSent as number[]) ?? [];
  if (alertsSent.includes(crossedThreshold)) return;

  // Build message body
  const pctDisplay = Math.round(pct * 100);
  const tierLines = (Object.keys(COST_PER_CALL) as PlacesTier[]).map((tier) => {
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
    log.info(`email sent (${pctDisplay}%)`);
  } catch (err) {
    log.error('email send failed', err);
  }

  // Send Slack if configured
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    try {
      const level = crossedThreshold >= 1.0 ? 'error' : crossedThreshold >= 0.75 ? 'warn' : 'info';
      await postSlackBlocks(slackWebhookUrl, buildAlertBlock(subject, body, level));
      log.info('Slack notification sent');
    } catch (err) {
      log.error('Slack notification failed', err);
    }
  }

  // Record that this threshold was alerted
  await alertsRef.set(
    { alertsSent: admin.firestore.FieldValue.arrayUnion(crossedThreshold) },
    { merge: true },
  );
}

// ─── Feature Flag Management ──────────────────────────────────────────────────

/**
 * Disable feature flags based on current estimated spend.
 * Flags are never re-enabled automatically — that's a manual safety measure.
 */
export async function updateFeatureFlags(
  db: admin.firestore.Firestore,
  estimatedCost: number,
): Promise<void> {
  if (estimatedCost >= MONTHLY_BUDGET) {
    await db.doc('appConfig/places').set(
      { contactTierEnabled: false, atmosphereTierEnabled: false },
      { merge: true },
    );
    log.warn('budget 100%+ — disabled both Places tiers');
  } else if (estimatedCost >= MONTHLY_BUDGET * 0.9) {
    await db.doc('appConfig/places').set(
      { atmosphereTierEnabled: false },
      { merge: true },
    );
    log.warn('budget 90%+ — disabled atmosphere tier');
  }
  // No automatic re-enable
}
