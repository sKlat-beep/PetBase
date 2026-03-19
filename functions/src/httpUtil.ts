/**
 * Shared HTTP utility for making JSON GET requests via Node's built-in https module.
 * Used by geocoding providers, Yelp service, and other server-side API calls.
 */
import * as https from 'https';

export function fetchJson(url: string, headers?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = headers ? { headers } : {};
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 500)}`));
            return;
          }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
