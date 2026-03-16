import { postSlackBlocks, buildErrorBlock } from './slackService';

// ─── Logger Interface ─────────────────────────────────────────────────────────

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  /** Logs to console.error AND fires a Slack block (fire-and-forget). */
  error(message: string, err?: unknown, data?: Record<string, string>): void;
}

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
export function createLogger(functionName: string): Logger {
  return {
    info(message: string, data?: Record<string, unknown>): void {
      const extra = data && Object.keys(data).length ? data : undefined;
      console.log(`[${functionName}] ${message}`, ...(extra ? [extra] : []));
    },

    warn(message: string, data?: Record<string, unknown>): void {
      const extra = data && Object.keys(data).length ? data : undefined;
      console.warn(`[${functionName}] ${message}`, ...(extra ? [extra] : []));
    },

    error(message: string, err?: unknown, data?: Record<string, string>): void {
      console.error(`[${functionName}] ${message}`, ...(err !== undefined ? [err] : []));

      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const errorObj = err instanceof Error ? err : new Error(message);
      const blocks = buildErrorBlock(functionName, errorObj, data?.uid, {
        context: message,
        ...data,
      });
      postSlackBlocks(webhookUrl, blocks).catch(() => {
        // Never propagate Slack failures
      });
    },
  };
}
