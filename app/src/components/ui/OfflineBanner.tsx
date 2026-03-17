import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
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
            className="bg-amber-500 dark:bg-amber-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 z-50"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            You're offline — changes will sync when reconnected
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
