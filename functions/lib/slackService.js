"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildErrorBlock = buildErrorBlock;
exports.buildAlertBlock = buildAlertBlock;
exports.postSlackBlocks = postSlackBlocks;
const https = require("https");
// ─── Emoji Map ────────────────────────────────────────────────────────────────
const EMOJI = {
    error: '🔴',
    warn: '🟡',
    info: '🔵',
};
// ─── Block Builders ───────────────────────────────────────────────────────────
/**
 * Build a Slack Block Kit payload for an error event.
 * Includes header, fields (message, UID, timestamp, env), and stack trace.
 */
function buildErrorBlock(fn, err, uid, extra) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack
        ? err.stack.slice(0, 1500)
        : '(no stack trace)';
    const fields = [
        { type: 'mrkdwn', text: `*Error:*\n${message}` },
        { type: 'mrkdwn', text: `*Timestamp (UTC):*\n${new Date().toISOString()}` },
        {
            type: 'mrkdwn',
            text: `*Environment:*\n${process.env.FUNCTIONS_EMULATOR === 'true' ? 'emulator' : 'production'}`,
        },
    ];
    if (uid) {
        fields.splice(1, 0, { type: 'mrkdwn', text: `*User UID:*\n${uid}` });
    }
    if (extra) {
        for (const [key, value] of Object.entries(extra)) {
            fields.push({ type: 'mrkdwn', text: `*${key}:*\n${value}` });
        }
    }
    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${EMOJI.error} [ERROR] ${fn}`, emoji: true },
        },
        { type: 'section', fields },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: `\`\`\`${stack}\`\`\`` },
        },
    ];
}
/**
 * Build a Slack Block Kit payload for an alert or informational event.
 */
function buildAlertBlock(title, message, level) {
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
function postSlackBlocks(webhookUrl, blocks) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ blocks });
        const parsed = new URL(webhookUrl);
        const options = {
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
            }
            else {
                reject(new Error(`Slack webhook responded with ${res.statusCode}`));
            }
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}
//# sourceMappingURL=slackService.js.map