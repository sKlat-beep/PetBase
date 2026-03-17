/**
 * Client-side telemetry logger — 7-day rolling retention, max 500 entries.
 * Stored in IndexedDB under `petbase-telemetry`.
 * Never transmitted automatically; only dispatched on user-initiated feedback
 * or uncaught error boundary triggers.
 */

import { get, set } from 'idb-keyval';

export type LogLevel = 'info' | 'warn' | 'error';

export interface TelemetryEntry {
  id: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = 'petbase-telemetry';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 500;

function prune(entries: TelemetryEntry[]): TelemetryEntry[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return entries.filter(e => e.timestamp >= cutoff).slice(-MAX_ENTRIES);
}

async function load(): Promise<TelemetryEntry[]> {
  try {
    return (await get<TelemetryEntry[]>(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

async function save(entries: TelemetryEntry[]): Promise<void> {
  try {
    await set(STORAGE_KEY, entries);
  } catch {
    // Non-critical — storage quota exceeded
  }
}

export async function logTelemetry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const entry: TelemetryEntry = {
    id: crypto.randomUUID(),
    level,
    message,
    context,
    timestamp: Date.now(),
  };
  const entries = prune(await load());
  entries.push(entry);
  await save(entries);
}

async function getTelemetryLog(): Promise<TelemetryEntry[]> {
  return prune(await load());
}

/** Serialise the log to a plain string for inclusion in reports. */
export async function serialiseTelemetryLog(): Promise<string> {
  const log = await getTelemetryLog();
  return log
    .map(e => {
      const ts = new Date(e.timestamp).toISOString();
      const ctx = e.context ? ` | ${JSON.stringify(e.context)}` : '';
      return `[${ts}] ${e.level.toUpperCase()} — ${e.message}${ctx}`;
    })
    .join('\n');
}
