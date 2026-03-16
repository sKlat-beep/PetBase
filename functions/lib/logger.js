"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const slackService_1 = require("./slackService");
// ─── Factory ──────────────────────────────────────────────────────────────────
/**
 * Create a named logger for a Cloud Function.
 * - info/warn → console only (no Slack noise)
 * - error     → console.error + fire-and-forget Slack block
 *
 * Reads SLACK_WEBHOOK_URL from process.env at call time.
 * Never throws — Slack failures are silently swallowed.
 *
 * Usage:
 *   const log = createLogger('findServices');
 *   log.error('Geocoding failed', err, { uid });
 */
function createLogger(functionName) {
    return {
        info(message, data) {
            const extra = data && Object.keys(data).length ? data : undefined;
            console.log(`[${functionName}] ${message}`, ...(extra ? [extra] : []));
        },
        warn(message, data) {
            const extra = data && Object.keys(data).length ? data : undefined;
            console.warn(`[${functionName}] ${message}`, ...(extra ? [extra] : []));
        },
        error(message, err, data) {
            console.error(`[${functionName}] ${message}`, ...(err !== undefined ? [err] : []));
            const webhookUrl = process.env.SLACK_WEBHOOK_URL;
            if (!webhookUrl)
                return;
            const errorObj = err instanceof Error ? err : new Error(message);
            const blocks = (0, slackService_1.buildErrorBlock)(functionName, errorObj, data === null || data === void 0 ? void 0 : data.uid, Object.assign({ context: message }, data));
            (0, slackService_1.postSlackBlocks)(webhookUrl, blocks).catch(() => {
                // Never propagate Slack failures
            });
        },
    };
}
//# sourceMappingURL=logger.js.map