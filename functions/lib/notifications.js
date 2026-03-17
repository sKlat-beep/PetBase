"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPostComment = exports.onPostReaction = exports.checkPetBirthdays = exports.sendWeeklyDigest = exports.sendEmailDigest = exports.onNotificationCreated = void 0;
exports.createNotification = createNotification;
exports.sendVaccineReminder = sendVaccineReminder;
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
// Kept as a no-op stub so index.ts re-export doesn't break. The full weekly
// digest is implemented below as sendWeeklyDigest.
exports.sendEmailDigest = (0, scheduler_1.onSchedule)('every day 08:00', async () => {
    console.log('sendEmailDigest: superseded by sendWeeklyDigest — no-op.');
});
// ─── sendWeeklyDigest ─────────────────────────────────────────────────────────
// Runs every Monday at 09:00 UTC.
// For each user who has opted in to email notifications:
//   1. Gathers unread notifications from the past 7 days.
//   2. Fetches the top-3 most recent posts from the user's joined groups.
//   3. Lists pets with vaccines or medications due in the next 7 days.
// Sends an HTML digest email via Gmail/nodemailer. Skips users who have nothing
// to report. Requires SMTP_USER and SMTP_PASS secrets.
const digestLog = (0, logger_1.createLogger)('sendWeeklyDigest');
exports.sendWeeklyDigest = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 09:00',
    secrets: ['SMTP_USER', 'SMTP_PASS'],
}, async () => {
    const db = admin.firestore();
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpUser || !smtpPass) {
        console.warn('[sendWeeklyDigest] SMTP_USER or SMTP_PASS not set — aborting.');
        return;
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
    });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const toDateStr = (d) => d.toISOString().slice(0, 10);
    const in7DaysStr = toDateStr(sevenDaysFromNow);
    const usersSnap = await db.collection('users').get();
    console.log(`[sendWeeklyDigest] Processing ${usersSnap.size} user(s).`);
    let sentCount = 0;
    let skippedCount = 0;
    await Promise.all(usersSnap.docs.map(async (userDoc) => {
        var _a, _b;
        const uid = userDoc.id;
        // ── Load profile ──────────────────────────────────────────────────────
        const profileSnap = await db.doc(`users/${uid}/profile/data`).get();
        const profile = profileSnap.data();
        if (!profile)
            return;
        if (profile.emailNotifications !== true)
            return;
        if (profile.emailDigestFrequency === 'off')
            return;
        // ── Fetch user auth record (email address) ─────────────────────────
        let recipientEmail;
        try {
            const userRecord = await admin.auth().getUser(uid);
            recipientEmail = userRecord.email;
        }
        catch (_c) {
            return; // user deleted or unavailable
        }
        if (!recipientEmail)
            return;
        const displayName = profile.displayName || 'PetBase user';
        // ── 1. Unread notifications from past 7 days ───────────────────────
        let unreadNotifs = [];
        try {
            const notifsSnap = await db
                .collection(`notifications/${uid}/items`)
                .where('read', '!=', true)
                .where('createdAt', '>=', sevenDaysAgo)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            unreadNotifs = notifsSnap.docs.map((d) => {
                var _a;
                const data = d.data();
                return (_a = data.message) !== null && _a !== void 0 ? _a : 'New notification';
            });
        }
        catch (err) {
            digestLog.error(`Failed to load notifications for uid=${uid}`, err, { uid });
        }
        // ── 2. Top-3 recent posts from user's joined groups ────────────────
        let topPosts = [];
        try {
            const joinedGroupsSnap = await db
                .collection('groups')
                .where('members', 'array-contains', uid)
                .get();
            if (!joinedGroupsSnap.empty) {
                // Collect recent posts across all joined groups
                const postPromises = joinedGroupsSnap.docs.map((groupDoc) => db
                    .collection(`groups/${groupDoc.id}/posts`)
                    .orderBy('createdAt', 'desc')
                    .limit(5)
                    .get()
                    .then((snap) => snap.docs.map((d) => {
                    var _a, _b, _c;
                    return ({
                        title: (_b = (_a = d.data().title) !== null && _a !== void 0 ? _a : d.data().content) !== null && _b !== void 0 ? _b : 'Untitled post',
                        groupName: (_c = groupDoc.data().name) !== null && _c !== void 0 ? _c : 'a group',
                        createdAt: d.data().createdAt,
                    });
                }))
                    .catch(() => []));
                const nested = await Promise.all(postPromises);
                const allPosts = nested.flat().sort((a, b) => {
                    var _a, _b, _c, _d;
                    const ta = (_b = (_a = a.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis()) !== null && _b !== void 0 ? _b : 0;
                    const tb = (_d = (_c = b.createdAt) === null || _c === void 0 ? void 0 : _c.toMillis()) !== null && _d !== void 0 ? _d : 0;
                    return tb - ta;
                });
                topPosts = allPosts.slice(0, 3).map((p) => `${p.title} (in ${p.groupName})`);
            }
        }
        catch (err) {
            digestLog.error(`Failed to load group posts for uid=${uid}`, err, { uid });
        }
        // ── 3. Upcoming vaccine/medication reminders (next 7 days) ─────────
        let upcomingReminders = [];
        try {
            const petsSnap = await db
                .collection('pets')
                .where('ownerId', '==', uid)
                .get();
            for (const petDoc of petsSnap.docs) {
                const pet = petDoc.data();
                const petName = (_a = pet.name) !== null && _a !== void 0 ? _a : 'your pet';
                const items = [
                    ...(Array.isArray(pet.vaccines) ? pet.vaccines : []),
                    ...(Array.isArray(pet.medications) ? pet.medications : []),
                ];
                for (const item of items) {
                    if (!item.nextDueDate)
                        continue;
                    if (item.nextDueDate <= in7DaysStr && item.nextDueDate >= toDateStr(new Date())) {
                        upcomingReminders.push(`${petName}: ${(_b = item.name) !== null && _b !== void 0 ? _b : 'health item'} due ${item.nextDueDate}`);
                    }
                }
            }
        }
        catch (err) {
            digestLog.error(`Failed to load reminders for uid=${uid}`, err, { uid });
        }
        // ── Skip if nothing to report ──────────────────────────────────────
        const hasContent = unreadNotifs.length > 0 || topPosts.length > 0 || upcomingReminders.length > 0;
        if (!hasContent) {
            skippedCount++;
            return;
        }
        // ── Build HTML ─────────────────────────────────────────────────────
        const listItems = (items) => items.length > 0
            ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
            : '<p><em>Nothing new this week.</em></p>';
        const html = [
            '<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">',
            `<h2 style="color:#1a73e8">Your PetBase Week</h2>`,
            `<p>Hi ${displayName},</p>`,
            `<p>Here's what happened on PetBase this week:</p>`,
            '<h3>Notifications</h3>',
            listItems(unreadNotifs),
            '<h3>Popular in Your Groups</h3>',
            listItems(topPosts),
            '<h3>Upcoming</h3>',
            listItems(upcomingReminders),
            '<hr>',
            '<p style="font-size:12px;color:#888">',
            'You received this because you have email notifications enabled in PetBase. ',
            'To unsubscribe, update your notification settings in the app.',
            '</p>',
            '<p style="font-size:12px;color:#888">— The PetBase Team</p>',
            '</body></html>',
        ].join('\n');
        // ── Send ───────────────────────────────────────────────────────────
        try {
            await transporter.sendMail({
                from: smtpUser,
                to: recipientEmail,
                subject: '[PetBase] Your Weekly Digest',
                html,
            });
            console.log(`[sendWeeklyDigest] Digest sent to ${recipientEmail} (uid=${uid})`);
            sentCount++;
        }
        catch (err) {
            digestLog.error(`Failed to send digest to uid=${uid}`, err, { uid });
        }
    }));
    console.log(`[sendWeeklyDigest] Done. sent=${sentCount} skipped=${skippedCount} total=${usersSnap.size}`);
});
// ─── checkPetBirthdays ────────────────────────────────────────────────────────
// Scheduled daily at 08:00 UTC — queries all pets and sends a birthday
// notification to each owner whose pet's birth month+day matches today.
exports.checkPetBirthdays = (0, scheduler_1.onSchedule)('every day 08:00', async () => {
    var _a;
    const db = admin.firestore();
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    // Gather all users
    const usersSnap = await db.collection('users').get();
    const tasks = [];
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const petsSnap = await db.collection(`users/${uid}/pets`).get();
        for (const petDoc of petsSnap.docs) {
            const pet = petDoc.data();
            const birthday = pet.birthday;
            if (!birthday)
                continue;
            const parts = birthday.split('-').map(Number);
            const petMonth = parts[1];
            const petDay = parts[2];
            if (petMonth !== todayMonth || petDay !== todayDay)
                continue;
            const petName = (_a = pet.name) !== null && _a !== void 0 ? _a : 'Your pet';
            const message = `Happy Birthday to ${petName}! 🎂`;
            tasks.push(db.collection(`notifications/${uid}/items`).add({
                type: 'birthday',
                petName,
                message,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }).then(() => {
                console.log(`checkPetBirthdays: birthday notification created for uid=${uid} pet=${petName}`);
            }));
        }
    }
    await Promise.all(tasks);
    console.log(`checkPetBirthdays: processed ${usersSnap.size} user(s)`);
});
// ─── createNotification ───────────────────────────────────────────────────────
// Generic helper: writes a notification document to notifications/{uid}/items.
// The onNotificationCreated trigger will deliver it via email/FCM.
async function createNotification(uid, payload) {
    const db = admin.firestore();
    await db.collection(`notifications/${uid}/items`).add(Object.assign(Object.assign({}, payload), { read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
}
// ─── onPostReaction ───────────────────────────────────────────────────────────
// Firestore trigger: groups/{groupId}/posts/{postId}/reactions/{reactionId}
// Notifies the post author when someone reacts to their post (excluding self-reactions).
exports.onPostReaction = (0, firestore_1.onDocumentCreated)('groups/{groupId}/posts/{postId}/reactions/{reactionId}', async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const reactionUid = (data.uid || data.userId);
    if (!reactionUid)
        return;
    const postSnap = await admin
        .firestore()
        .doc(`groups/${event.params.groupId}/posts/${event.params.postId}`)
        .get();
    const post = postSnap.data();
    if (!post)
        return;
    const authorUid = (post.authorUid || post.uid);
    if (!authorUid)
        return;
    // Don't notify if reacting to own post
    if (reactionUid === authorUid)
        return;
    await createNotification(authorUid, {
        type: 'post_reaction',
        groupId: event.params.groupId,
        postId: event.params.postId,
        fromUid: reactionUid,
        message: 'Someone reacted to your post.',
    });
    console.log(`onPostReaction: notification created for author uid=${authorUid} from uid=${reactionUid}`);
});
// ─── onPostComment ────────────────────────────────────────────────────────────
// Firestore trigger: groups/{groupId}/posts/{postId}/comments/{commentId}
// Notifies the post author when someone comments on their post (excluding self-comments).
exports.onPostComment = (0, firestore_1.onDocumentCreated)('groups/{groupId}/posts/{postId}/comments/{commentId}', async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const commenterUid = (data.uid || data.userId || data.authorUid);
    if (!commenterUid)
        return;
    const postSnap = await admin
        .firestore()
        .doc(`groups/${event.params.groupId}/posts/${event.params.postId}`)
        .get();
    const post = postSnap.data();
    if (!post)
        return;
    const authorUid = (post.authorUid || post.uid);
    if (!authorUid)
        return;
    // Don't notify if commenting on own post
    if (commenterUid === authorUid)
        return;
    await createNotification(authorUid, {
        type: 'post_comment',
        groupId: event.params.groupId,
        postId: event.params.postId,
        fromUid: commenterUid,
        message: 'Someone commented on your post.',
    });
    console.log(`onPostComment: notification created for author uid=${authorUid} from uid=${commenterUid}`);
});
// ─── sendVaccineReminder ──────────────────────────────────────────────────────
// Creates a notification document in users/{uid}/notifications for a vaccine
// or medication due-date reminder. The onNotificationCreated trigger will then
// deliver the notification via email and/or FCM push based on user preferences.
async function sendVaccineReminder(uid, petName, vaccineName, daysUntilDue) {
    const db = admin.firestore();
    const message = daysUntilDue === 1
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
//# sourceMappingURL=notifications.js.map