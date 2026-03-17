export function isOnline(lastSeen?: number): boolean {
  return !!lastSeen && lastSeen > Date.now() - 15 * 60 * 1000;
}

/**
 * Format a lastActive timestamp (ms) into a human-readable relative string.
 * Used in the DM conversation header.
 */
export function formatLastActive(ts: number | null | undefined): string {
  if (!ts) return '';
  const mins = (Date.now() - ts) / 60000;
  if (mins < 5) return 'Active now';
  if (mins < 60) return `Active ${Math.floor(mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  return 'Active today';
}
