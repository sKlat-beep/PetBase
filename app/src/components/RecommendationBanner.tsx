import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Sparkles, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { LEVEL_LABELS } from '../lib/onboardingService';
import { TOTAL_FEATURES } from '../data/featureHints';

export function RecommendationBanner() {
  const { user } = useAuth();
  const ob = useOnboarding(user?.uid ?? null);
  const [showShimmer, setShowShimmer] = useState(false);
  const prevHintIdRef = useRef<string | null>(null);

  // Override current hint when user clicks "Surprise me"
  const [overrideHint, setOverrideHint] = useState<ReturnType<typeof ob.randomHint>>(null);
  const current = overrideHint ?? ob.currentHint;

  // Detect when a new hint appears for the first time → shimmer
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
          className={`relative bg-gradient-to-r ${current.accentClasses} rounded-2xl p-4 border flex items-center gap-3 overflow-hidden`}
        >
          {/* Unlock shimmer overlay */}
          {showShimmer && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent pointer-events-none"
            />
          )}

          <Sparkles className="w-5 h-5 text-neutral-400 dark:text-neutral-500 shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">Did you know? </span>
              {current.title}
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-0.5 hidden sm:block">
              {current.description}
            </p>
          </div>

          <Link
            to={current.to}
            className="shrink-0 flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors whitespace-nowrap"
          >
            {current.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Surprise me button */}
          <button
            type="button"
            onClick={handleSurprise}
            className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Show a random tip"
            title="Surprise me"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(current.id)}
            className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Dismiss recommendation"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Discovery counter + Pet Parent Level */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          You've explored {ob.discoveryCount} of {TOTAL_FEATURES} features
        </p>
        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
          {LEVEL_LABELS[ob.petParentLevel]}
        </p>
      </div>
    </div>
  );
}
