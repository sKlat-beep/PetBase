/**
 * Platform capability detection.
 *
 * Abstracts web-only APIs so they can be safely guarded when PetBase is
 * wrapped in a Capacitor native shell (iOS / Android). Each helper returns
 * false inside a Capacitor native context where the corresponding web API is
 * unavailable or unreliable.
 *
 * Usage:
 *   import { canPrint, canShare, canDownloadFile } from '../utils/platform';
 *   if (canPrint()) window.print();
 */

/** True when running inside a Capacitor native wrapper (iOS/Android). */
function isNative(): boolean {
  return (
    typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform?.() === true
  );
}

/**
 * True when the Web Share API is available.
 * Note: navigator.share is actually MORE available on native (via Capacitor),
 * but html2pdf / DOM-based sharing is not. This guard is for the web fallback
 * clipboard path — on native, Capacitor Share plugin should be used instead.
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
