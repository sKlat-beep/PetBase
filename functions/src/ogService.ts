import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';

export interface OgMetadata {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
  fetchedAt: number;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_BODY = 500 * 1024; // 500KB
const TIMEOUT_MS = 5000;

// Reject private/reserved IP ranges
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|localhost|::1|\[::1\])/.test(host)) return true;
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;
    return false;
  } catch { return true; }
}

function extractOgTags(html: string): Partial<OgMetadata> {
  const get = (prop: string): string => {
    const re = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i');
    return re.exec(html)?.[1] || re2.exec(html)?.[1] || '';
  };
  // Fallback to <title> if og:title missing
  const ogTitle = get('title');
  const titleFallback = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] || '';
  return {
    title: ogTitle || titleFallback,
    description: get('description') || '',
    image: get('image') || '',
    siteName: get('site_name') || '',
  };
}

export async function fetchOgMetadata(url: string): Promise<OgMetadata | null> {
  if (isPrivateUrl(url)) return null;

  const db = admin.firestore();
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  const cacheRef = db.collection('ogCache').doc(hash);

  // Check cache
  const cached = await cacheRef.get();
  if (cached.exists) {
    const data = cached.data() as OgMetadata;
    if (Date.now() - data.fetchedAt < TTL_MS) return data;
  }

  // Fetch
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: TIMEOUT_MS, headers: { 'User-Agent': 'PetBase-LinkPreview/1.0' } }, (res) => {
      if (res.statusCode && (res.statusCode >= 300 && res.statusCode < 400) && res.headers.location) {
        // Follow one redirect
        if (!isPrivateUrl(res.headers.location)) {
          fetchOgMetadata(res.headers.location).then(resolve);
        } else {
          resolve(null);
        }
        return;
      }
      if (res.statusCode !== 200) { resolve(null); return; }

      let body = '';
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY) { res.destroy(); resolve(null); return; }
        body += chunk.toString();
      });
      res.on('end', async () => {
        const tags = extractOgTags(body);
        const metadata: OgMetadata = {
          title: tags.title || '',
          description: tags.description || '',
          image: tags.image || '',
          siteName: tags.siteName || '',
          url,
          fetchedAt: Date.now(),
        };
        await cacheRef.set(metadata).catch(() => {});
        resolve(metadata);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}
