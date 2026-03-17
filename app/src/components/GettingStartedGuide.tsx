import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { usePets } from '../contexts/PetContext';

// Per petbase-system-instructions.md: when new core features are added,
// add a corresponding checklist item here if it fundamentally benefits a new user.
const STEPS = [
  {
    id: 'add-pet',
    label: 'Add your first pet',
    description: 'Create a profile for your furry companion.',
    auto: true, // derived from PetContext — not manually toggleable
    skippable: false,
    path: '/pets',
    state: { openAddModal: true },
  },
  {
    id: 'create-card',
    label: 'Create a pet card',
    description: 'Generate an emergency or sitter card for your pet.',
    auto: false,
    skippable: true,
    path: '/cards',
  },
  {
    id: 'join-community',
    label: 'Join a community',
    description: 'Connect with other pet parents and find local meetups.',
    auto: false,
    skippable: true,
    path: '/community',
  },
  {
    id: 'find-services',
    label: 'Find nearby services',
    description: 'Search for top-rated vets, groomers, and sitters near you.',
    auto: false,
    skippable: true,
    path: '/search',
  },
  {
    id: 'create-family',
    label: 'Create or join a family',
    description: 'Invite family members to co-manage your pets.',
    auto: false,
    skippable: true,
    path: '/settings',
    state: { scrollTo: 'section-family' },
  },
  {
    id: 'enable-notifications',
    label: 'Stay in the loop',
    description: 'Enable email or push notifications in Settings → Notifications.',
    auto: false,
    skippable: true,
    path: '/settings',
    state: { scrollTo: 'section-notifications' },
  },
  {
    id: 'privacy-settings',
    label: 'Control your privacy',
    description: 'Control who can message you or invite you to groups in Settings → Privacy.',
    auto: false,
    skippable: true,
    path: '/settings',
    state: { scrollTo: 'section-privacy' },
  },
] as const;

const COMPLETE_KEY = 'petbase-guide-completed';
const SKIPPED_KEY = 'petbase-guide-skipped';

// Circumference of SVG circle with r=16 in a 40×40 viewBox
const CIRCUMFERENCE = 2 * Math.PI * 16; // ≈ 100.53

interface GettingStartedGuideProps {
  onComplete: () => void;
}

export function GettingStartedGuide({ onComplete }: GettingStartedGuideProps) {
  const { pets } = usePets();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem('petbase-guide-expanded') !== 'false';
  });

  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(SKIPPED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    const checkSteps = () => {
      setCompletedSteps({
        'create-card': localStorage.getItem('petbase-step-create-card') === 'true',
        'join-community': localStorage.getItem('petbase-step-join-community') === 'true',
        'find-services': localStorage.getItem('petbase-step-find-services') === 'true',
        'create-family': localStorage.getItem('petbase-step-create-family') === 'true',
        'enable-notifications': localStorage.getItem('petbase-step-enable-notifications') === 'true',
        'privacy-settings': localStorage.getItem('petbase-step-privacy-settings') === 'true',
      });
    };
    checkSteps();
    window.addEventListener('storage', checkSteps);
    window.addEventListener('petbase-guide-update', checkSteps);
    return () => {
      window.removeEventListener('storage', checkSteps);
      window.removeEventListener('petbase-guide-update', checkSteps);
    };
  }, []);

  const isComplete = useCallback(
    (id: string) => {
      if (id === 'add-pet') return pets.length > 0;
      return !!completedSteps[id];
    },
    [pets.length, completedSteps]
  );

  const isDone = useCallback(
    (id: string) => isComplete(id) || skippedSteps.has(id),
    [isComplete, skippedSteps]
  );

  const handleSkip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(skippedSteps);
    next.add(id);
    setSkippedSteps(next);
    localStorage.setItem(SKIPPED_KEY, JSON.stringify([...next]));
    window.dispatchEvent(new Event('petbase-guide-update'));
  };

  const completedCount = STEPS.filter((s) => isDone(s.id)).length;
  const allComplete = completedCount === STEPS.length;

  const handleStepClick = (step: typeof STEPS[number]) => {
    if (step.path) {
      navigate(step.path, { state: 'state' in step ? step.state : undefined });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded((v) => {
      const next = !v;
      localStorage.setItem('petbase-guide-expanded', String(next));
      return next;
    });
  };

  // Once all steps done/skipped, briefly show completion then permanently remove the guide
  useEffect(() => {
    if (!allComplete) return;
    const timer = setTimeout(() => {
      localStorage.setItem(COMPLETE_KEY, 'true');
      onComplete();
    }, 1400);
    return () => clearTimeout(timer);
  }, [allComplete, onComplete]);

  const progressDash = (completedCount / STEPS.length) * CIRCUMFERENCE;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Circular progress ring */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20" cy="20" r="16"
                fill="none" strokeWidth="3"
                className="text-stone-100 dark:text-stone-700"
                stroke="currentColor"
              />
              <circle
                cx="20" cy="20" r="16"
                fill="none" strokeWidth="3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray={`${progressDash} ${CIRCUMFERENCE}`}
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {completedCount}/{STEPS.length}
            </span>
          </div>
          <div>
            <p className="font-bold text-stone-900 dark:text-stone-100">
              {allComplete ? 'All done! Great work.' : 'Getting Started'}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {allComplete
                ? 'Your PetBase is set up.'
                : `${STEPS.length - completedCount} step${STEPS.length - completedCount === 1 ? '' : 's'} remaining`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-stone-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-stone-400 shrink-0" />
        )}
      </button>

      {/* Step list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-stone-100 dark:border-stone-700 px-5 pb-5 pt-4 space-y-2">
              {STEPS.map((step) => {
                const done = isComplete(step.id);
                const skipped = skippedSteps.has(step.id);
                const finished = done || skipped;
                return (
                  <div key={step.id} className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-colors ${finished ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-stone-50 dark:hover:bg-stone-700/40'}`}>
                    <button
                      type="button"
                      onClick={() => !finished && handleStepClick(step)}
                      className="flex items-start gap-3 flex-1 text-left"
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : skipped ? (
                        <CheckCircle2 className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-stone-300 dark:text-stone-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${finished ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>
                          {step.label}
                          {skipped && <span className="ml-1.5 text-xs font-normal no-underline">(skipped)</span>}
                        </p>
                        {!finished && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </button>
                    {step.skippable && !finished && (
                      <button
                        type="button"
                        onClick={(e) => handleSkip(e, step.id)}
                        title="Skip this step"
                        className="p-1 rounded-lg text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shrink-0 mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Call this from Cards.tsx after a card is actually created. */
export function markCardCreated() {
  localStorage.setItem('petbase-step-create-card', 'true');
  window.dispatchEvent(new Event('petbase-guide-update'));
}

/** Call this from Search.tsx when a search is submitted or result is clicked. */
export function markServicesFound() {
  localStorage.setItem('petbase-step-find-services', 'true');
  window.dispatchEvent(new Event('petbase-guide-update'));
}

/** Call this when a household is created or joined. */
export function markFamilyCreated() {
  localStorage.setItem('petbase-step-create-family', 'true');
  window.dispatchEvent(new Event('petbase-guide-update'));
}

/** Call this from Settings when the user enables email or push notifications. */
export function markNotificationsEnabled(): void {
  localStorage.setItem('petbase-step-enable-notifications', 'true');
  window.dispatchEvent(new Event('petbase-guide-update'));
}

/** Call this from Settings when the user configures a privacy setting. */
export function markPrivacyConfigured(): void {
  localStorage.setItem('petbase-step-privacy-settings', 'true');
  window.dispatchEvent(new Event('petbase-guide-update'));
}
