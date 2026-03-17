importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Firebase config is injected at runtime by the main app via postMessage.
// The service worker listens for a FIREBASE_CONFIG message before initialising.

let messagingInitialised = false;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && !messagingInitialised) {
    try {
      firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const title = payload.notification?.title ?? 'PetBase';
        const options = {
          body: payload.notification?.body ?? '',
          icon: '/paw-icon.png',
          badge: '/paw-icon.png',
          data: payload.data ?? {},
        };
        self.registration.showNotification(title, options);
      });

      messagingInitialised = true;
    } catch (err) {
      console.error('[firebase-messaging-sw] init failed:', err);
    }
  }
});
