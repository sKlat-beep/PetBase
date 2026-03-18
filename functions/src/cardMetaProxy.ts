/**
 * cardMetaProxy — OG meta tags for pet card link previews.
 *
 * When a bot user agent (WhatsApp, iMessage, Twitter, etc.) requests
 * /cards/view/:cardId, this function returns an HTML page with og: meta tags
 * so the link preview shows the pet's name, card type, and avatar.
 *
 * Regular browsers receive a meta-refresh redirect to the SPA.
 * Also increments a lightweight viewCount on the public card doc.
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const BOT_UA_PATTERN = /bot|crawl|spider|preview|whatsapp|telegrambot|twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|imessage|applebot|googlebot/i;

const PETBASE_OG_IMAGE = 'https://petbase.app/assets/og-default.png';

export const cardMetaProxy = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    // Extract cardId from path: /cards/view/:cardId
    const parts = req.path.split('/');
    const cardId = parts[parts.length - 1];

    if (!cardId) {
      res.status(404).send('Not found');
      return;
    }

    const userAgent = req.headers['user-agent'] ?? '';
    const isBot = BOT_UA_PATTERN.test(userAgent);

    if (!isBot) {
      // Regular browser — serve SPA with meta refresh as fallback
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0;url=/cards/view/${encodeURIComponent(cardId)}" />
<script>window.location.replace('/cards/view/${encodeURIComponent(cardId)}')</script>
</head><body></body></html>`);
      return;
    }

    // Bot request — fetch card data for OG tags
    try {
      const db = admin.firestore();
      const docRef = db.doc(`publicCards/${cardId}`);
      const snap = await docRef.get();

      if (!snap.exists) {
        res.status(404).send('Card not found');
        return;
      }

      const data = snap.data()!;

      if (data.status === 'revoked') {
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(buildOgHtml('Pet Card — Revoked', 'This card has been revoked.', PETBASE_OG_IMAGE, cardId));
        return;
      }

      const petName = data.petSnapshot?.name ?? 'Pet';
      const template = data.template ?? 'card';
      const petImage = data.petSnapshot?.image || PETBASE_OG_IMAGE;
      const title = `${petName}'s ${capitalize(template)} Card`;
      const description = `View ${petName}'s pet card on PetBase`;

      // Lightweight analytics — fire-and-forget
      docRef.update({
        viewCount: admin.firestore.FieldValue.increment(1),
      }).catch(() => { /* non-critical */ });

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=300');
      res.send(buildOgHtml(title, description, petImage, cardId));
    } catch {
      res.status(500).send('Internal error');
    }
  },
);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildOgHtml(title: string, description: string, image: string, cardId: string): string {
  const url = `https://petbase.app/cards/view/${encodeURIComponent(cardId)}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — PetBase</title>
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:image" content="${escapeAttr(image)}" />
  <meta property="og:url" content="${escapeAttr(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="PetBase" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(image)}" />
  <meta http-equiv="refresh" content="0;url=${escapeAttr(url)}" />
</head>
<body></body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
