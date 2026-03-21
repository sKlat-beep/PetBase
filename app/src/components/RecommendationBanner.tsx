import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { LEVEL_LABELS } from '../lib/onboardingService';
import { TOTAL_FEATURES } from '../data/featureHints';
import { useUI } from '../contexts/UIContext';

export function RecommendationBanner() {
  const { user } = useAuth();
  const ob = useOnboarding(user?.uid ?? null);
  const { openSettingsModal } = useUI();
  const [showShimmer, setShowShimmer] = useState(false);
  const prevHintIdRef = useRef<string | null>(null);

  // Override current hint when user clicks "Surprise me"
  const [overrideHint, setOverrideHint] = useState<ReturnType<typeof ob.randomHint>>(null);
  const current = overrideHint ?? ob.currentHint;

  // Detect when a new hint appears for the first time -> shimmer
  useEffect(() => {
    if (current && current.id !== prevHintIdRef.current) {
      if (prevHintIdRef.current !== null) {
        setShowShimmer(true);
        const t = setTimeout(() => setShowShimmer(false), 2000);
        return () => clearTimeout(t);
      }
      prevHintIdRef.current = current.id;
    }
  }, [current]);

  const handleDismiss = (id: string) => {
    ob.dismissHint(id);
    setOverrideHint(null);
  };

  const handleSurprise = () => {
    const hint = ob.randomHint();
    if (hint) setOverrideHint(hint);
  };

  if (!current) return null;

  return (
    <div className="space-y-1.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={`relative glass-card p-4 border border-outline-variant flex items-center gap-3 overflow-hidden`}
        >
          {/* Unlock shimmer overlay */}
          {showShimmer && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-tint/20 to-transparent pointer-events-none"
            />
          )}

          <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">auto_awesome</span>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-on-surface text-sm">
              <span className="text-on-surface-variant font-normal">Did you know? </span>
              {current.title}
            </p>
            <p className="text-on-surface-variant text-sm mt-0.5 hidden sm:block">
              {current.description}
            </p>
          </div>

          {current.to === '/settings' ? (
            <button
              type="button"
              onClick={() => openSettingsModal()}
              className="shrink-0 flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              {current.cta}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <Link
              to={current.to}
              className="shrink-0 flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              {current.cta}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          )}

          {/* Surprise me button */}
          <button
            type="button"
            onClick={handleSurprise}
            className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container"
            aria-label="Show a random tip"
            title="Surprise me"
          >
            <span className="material-symbols-outlined text-[16px]">shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(current.id)}
            className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container"
            aria-label="Dismiss recommendation"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Discovery counter + Pet Parent Level */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-on-surface-variant/60">
          You've explored {ob.discoveryCount} of {TOTAL_FEATURES} features
        </p>
        <p className="text-xs font-medium text-on-surface-variant/60">
          {LEVEL_LABELS[ob.petParentLevel]}
        </p>
      </div>
    </div>
  );
}
