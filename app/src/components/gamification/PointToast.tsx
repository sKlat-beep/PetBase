import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ToastData {
  id: number;
  action: string;
  points: number;
  badges?: string[];
}

let nextId = 0;

export default function PointToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as {
        action?: string;
        points?: number;
        badges?: string[];
      } | undefined;
      if (!detail?.points) return;

      const id = nextId++;
      const toast: ToastData = {
        id,
        action: detail.action ?? 'Action',
        points: detail.points,
        badges: detail.badges,
      };

      setToasts((prev) => [...prev, toast]);

      setTimeout(() => dismiss(id), 3000);
    }

    window.addEventListener('petbase-points-awarded', handler);
    return () => window.removeEventListener('petbase-points-awarded', handler);
  }, [dismiss]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-on-primary shadow-lg"
          >
            <span className="material-symbols-outlined text-lg">stars</span>
            <div className="text-sm">
              <span className="font-semibold">+{t.points} pts!</span>
              <span className="ml-1.5 opacity-80">
                {t.action.replace(/-/g, ' ')}
              </span>
              {t.badges && t.badges.length > 0 && (
                <div className="mt-0.5 flex items-center gap-1 text-xs opacity-90">
                  <span className="material-symbols-outlined text-xs">emoji_events</span>
                  {t.badges.join(', ')}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
