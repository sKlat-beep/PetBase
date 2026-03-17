import * as https from 'https';

// ─── Emoji Map ────────────────────────────────────────────────────────────────

const EMOJI: Record<'error' | 'warn' | 'info', string> = {
  error: '🔴',
  warn:  '🟡',
  info:  '🔵',
};

// ─── Block Builders ───────────────────────────────────────────────────────────

/**
 * Build a Slack Block Kit payload for an alert or informational event.
 */
export function buildAlertBlock(
  title: string,
  message: string,
  level: 'info' | 'warn' | 'error',
): object[] {
  const emoji = EMOJI[level];
  const label = level.toUpperCase();
  const env = process.env.FUNCTIONS_EMULATOR === 'true' ? 'emulator' : 'production';

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} [${label}] ${title}`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: message },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Timestamp:* ${new Date().toISOString()} | *Environment:* ${env}`,
        },
      ],
    },
  ];
}

// ─── Webhook Sender ───────────────────────────────────────────────────────────

/**
 * POST a Block Kit payload to a Slack Incoming Webhook URL.
 * Uses the raw Node `https` module — no additional dependencies.
 */
export function postSlackBlocks(webhookUrl: string, blocks: object[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ blocks });
    const parsed = new URL(webhookUrl);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      res.resume();
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Slack webhook responded with ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
