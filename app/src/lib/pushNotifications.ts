import { getMessaging, getToken } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Requests browser push permission, obtains an FCM registration token,
 * saves it to Firestore at users/{uid}/fcmTokens/{token}, and returns it.
 * Returns null if permission was denied or an error occurred.
 *
 * Also posts the Firebase config to the service worker so it can initialise
 * Firebase Messaging for background push handling.
 */
export async function requestPushPermission(uid: string): Promise<string | null> {
  try {
    if (!isPushSupported()) {
      console.warn('pushNotifications: browser does not support push notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('pushNotifications: permission not granted');
      return null;
    }

    // Register the service worker and wait for it to become active
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );
    await navigator.serviceWorker.ready;

    // Send Firebase config to the service worker so it can initialise FCM
    // for background message handling.
    const app = getApp();
    const firebaseConfig = (app as unknown as { options: Record<string, unknown> }).options;
    swRegistration.active?.postMessage({
      type: 'FIREBASE_CONFIG',
      config: firebaseConfig,
    });

    if (!VAPID_KEY) {
      console.warn(
        'pushNotifications: VITE_VAPID_PUBLIC_KEY is not set — cannot obtain FCM token',
      );
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      // Save FCM token to Firestore so Cloud Function can send push notifications
      await setDoc(
        doc(db, 'users', uid, 'fcmTokens', token),
        { token, createdAt: Date.now() },
      );
    }

    return token ?? null;
  } catch (err) {
    console.error('pushNotifications: requestPushPermission failed:', err);
    return null;
  }
}

/** Returns true if the browser supports the Web Notifications and Service Worker APIs. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/**
 * Returns a human-readable string describing the current push permission state.
 * Useful for displaying status text in settings UI.
 */
export function getPushPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as 'granted' | 'denied' | 'default';
}
