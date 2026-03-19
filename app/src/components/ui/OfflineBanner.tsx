import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div
            className="bg-tertiary-container text-on-tertiary-container text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 z-50"
            role="status"
            aria-live="polite"
          >
            <span className="material-symbols-outlined text-[14px] flex-shrink-0" aria-hidden="true">wifi_off</span>
            You're offline — changes will sync when reconnected
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
