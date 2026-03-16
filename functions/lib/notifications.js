"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailDigest = exports.onNotificationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const logger_1 = require("./logger");
const log = (0, logger_1.createLogger)('onNotificationCreated');
// ─── Secrets ─────────────────────────────────────────────────────────────────
// Set via:
//   firebase functions:secrets:set SMTP_USER
//   firebase functions:secrets:set SMTP_PASS
//
// Secrets are bound in the function options array below and accessed via process.env at runtime.
// ─── onNotificationCreated ────────────────────────────────────────────────────
// Firestore trigger: notifications/{uid}/items/{notifId}
// Sends email and/or FCM push based on the recipient's profile preferences.
exports.onNotificationCreated = (0, firestore_1.onDocumentCreated)({
    document: 'notifications/{uid}/items/{notifId}',
    secrets: ['SMTP_USER', 'SMTP_PASS', 'SLACK_WEBHOOK_URL'],
}, async (event) => {
    var _a, _b, _c;
    const uid = event.params.uid;
    const notification = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!notification)
        return;
    // ── Load user profile ────────────────────────────────────────────────────
    const profileSnap = await admin.firestore()
        .doc(`users/${uid}/profile/data`)
        .get();
    const profile = profileSnap.data();
    if (!profile) {
        console.warn(`onNotificationCreated: no profile found for uid=${uid}`);
        return;
    }
    // ── Email ────────────────────────────────────────────────────────────────
    if (profile.emailNotifications === true && profile.emailDigestFrequency !== 'off') {
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (!smtpUser || !smtpPass) {
            console.warn('onNotificationCreated: SMTP_USER or SMTP_PASS not set — skipping email');
        }
        else {
            try {
                const userRecord = await admin.auth().getUser(uid);
                const recipientEmail = userRecord.email;
                if (recipientEmail) {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: { user: smtpUser, pass: smtpPass },
                    });
                    const subject = `[PetBase] ${(_b = notification.message) !== null && _b !== void 0 ? _b : 'New notification'}`;
                    const body = [
                        `Hi ${profile.displayName || 'PetBase user'},`,
                        '',
                        (_c = notification.message) !== null && _c !== void 0 ? _c : 'You have a new notification on PetBase.',
                        '',
                        'Visit PetBase to see more details.',
                        '',
                        '— The PetBase Team',
                        '',
                        'To unsubscribe from email notifications, update your notification settings in the app.',
                    ].join('\n');
                    await transporter.sendMail({
                        from: smtpUser,
                        to: recipientEmail,
                        subject,
                        text: body,
                    });
                    console.log(`onNotificationCreated: email sent to ${recipientEmail} for uid=${uid}`);
                }
            }
            catch (err) {
                log.error(`email send failed for uid=${uid}`, err, { uid });
            }
        }
    }
    // ── Push notification — Firebase Admin Messaging (FCM) ───────────────────
    if (profile.pushNotifications === true) {
        try {
            // Load FCM tokens for this user from Firestore
            const tokensSnap = await admin.firestore()
                .collection(`users/${uid}/fcmTokens`)
                .get();
            if (!tokensSnap.empty) {
                const sends = tokensSnap.docs.map(async (tokenDoc) => {
                    var _a, _b;
                    const fcmToken = tokenDoc.data().token;
                    try {
                        await admin.messaging().send({
                            token: fcmToken,
                            notification: {
                                title: 'PetBase',
                                body: notification.message,
                            },
                            data: {
                                type: notification.type,
                                targetId: (_a = notification.targetId) !== null && _a !== void 0 ? _a : '',
                            },
                        });
                    }
                    catch (err) {
                        // Remove invalid/expired tokens
                        const errorCode = (_b = err.errorInfo) === null || _b === void 0 ? void 0 : _b.code;
                        if (errorCode === 'messaging/registration-token-not-registered' ||
                            errorCode === 'messaging/invalid-registration-token') {
                            await tokenDoc.ref.delete();
                            console.log(`onNotificationCreated: removed stale FCM token for uid=${uid}`);
                        }
                        else {
                            log.error(`FCM send failed for uid=${uid}`, err, { uid });
                        }
                    }
                });
                await Promise.all(sends);
                console.log(`onNotificationCreated: FCM push sent to ${tokensSnap.size} token(s) for uid=${uid}`);
            }
        }
        catch (err) {
            log.error('Push notification failed', err, { uid });
        }
    }
});
// ─── sendEmailDigest ──────────────────────────────────────────────────────────
// Scheduled daily at 08:00 UTC — stub for Phase 3c full implementation.
exports.sendEmailDigest = (0, scheduler_1.onSchedule)('every day 08:00', async () => {
    console.log('sendEmailDigest: Email digest scheduled function — to be implemented in Phase 3c full');
    // TODO Phase 3c full: query notifications/{uid}/items where read=false grouped by user,
    // batch into daily/weekly digest emails based on emailDigestFrequency preference.
});
//# sourceMappingURL=notifications.js.map