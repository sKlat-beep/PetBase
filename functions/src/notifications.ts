import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { createLogger } from './logger';

const log = createLogger('onNotificationCreated');

// ─── Secrets ─────────────────────────────────────────────────────────────────
// Set via:
//   firebase functions:secrets:set SMTP_USER
//   firebase functions:secrets:set SMTP_PASS
//
// Secrets are bound in the function options array below and accessed via process.env at runtime.

// ─── onNotificationCreated ────────────────────────────────────────────────────
// Firestore trigger: notifications/{uid}/items/{notifId}
// Sends email and/or FCM push based on the recipient's profile preferences.

export const onNotificationCreated = onDocumentCreated(
  {
    document: 'notifications/{uid}/items/{notifId}',
    secrets: ['SMTP_USER', 'SMTP_PASS', 'SLACK_WEBHOOK_URL'],
  },
  async (event) => {
    const uid = event.params.uid;
    const notification = event.data?.data();
    if (!notification) return;

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
      } else {
        try {
          const userRecord = await admin.auth().getUser(uid);
          const recipientEmail = userRecord.email;

          if (recipientEmail) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: { user: smtpUser, pass: smtpPass },
            });

            const subject = `[PetBase] ${notification.message ?? 'New notification'}`;
            const body = [
              `Hi ${profile.displayName || 'PetBase user'},`,
              '',
              notification.message ?? 'You have a new notification on PetBase.',
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
        } catch (err) {
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
            const fcmToken = tokenDoc.data().token as string;
            try {
              await admin.messaging().send({
                token: fcmToken,
                notification: {
                  title: 'PetBase',
                  body: notification.message as string,
                },
                data: {
                  type: notification.type as string,
                  targetId: (notification.targetId as string) ?? '',
                },
              });
            } catch (err: unknown) {
              // Remove invalid/expired tokens
              const errorCode = (err as { errorInfo?: { code?: string } }).errorInfo?.code;
              if (
                errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token'
              ) {
                await tokenDoc.ref.delete();
                console.log(`onNotificationCreated: removed stale FCM token for uid=${uid}`);
              } else {
                log.error(`FCM send failed for uid=${uid}`, err, { uid });
              }
            }
          });
          await Promise.all(sends);
          console.log(`onNotificationCreated: FCM push sent to ${tokensSnap.size} token(s) for uid=${uid}`);
        }
      } catch (err) {
        log.error('Push notification failed', err, { uid });
      }
    }
  },
);

// ─── sendEmailDigest ──────────────────────────────────────────────────────────
// Scheduled daily at 08:00 UTC — stub for Phase 3c full implementation.

export const sendEmailDigest = onSchedule('every day 08:00', async () => {
  console.log('sendEmailDigest: Email digest scheduled function — to be implemented in Phase 3c full');
  // TODO Phase 3c full: query notifications/{uid}/items where read=false grouped by user,
  // batch into daily/weekly digest emails based on emailDigestFrequency preference.
});

// ─── sendVaccineReminder ──────────────────────────────────────────────────────
// Creates a notification document in users/{uid}/notifications for a vaccine
// or medication due-date reminder. The onNotificationCreated trigger will then
// deliver the notification via email and/or FCM push based on user preferences.

export async function sendVaccineReminder(
  uid: string,
  petName: string,
  vaccineName: string,
  daysUntilDue: number,
): Promise<void> {
  const db = admin.firestore();
  const message =
    daysUntilDue === 1
      ? `Reminder: ${petName}'s ${vaccineName} is due tomorrow.`
      : `Reminder: ${petName}'s ${vaccineName} is due in ${daysUntilDue} days.`;

  await db.collection(`notifications/${uid}/items`).add({
    type: 'vaccine_reminder',
    petName,
    vaccineName,
    daysUntilDue,
    message,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`sendVaccineReminder: created reminder for uid=${uid} pet=${petName} vaccine=${vaccineName} daysUntilDue=${daysUntilDue}`);
}
