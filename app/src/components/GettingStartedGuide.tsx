import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import { STEPS, TOTAL_STEPS } from '../data/onboardingSteps';
import { useOnboarding } from '../hooks/useOnboarding';
import { LEVEL_LABELS } from '../lib/onboardingService';

// Re-export mark*() functions from onboardingService so existing callers don't break
export {
  markCardCreated,
  markServicesFound,
  markFamilyCreated,
  markNotificationsEnabled,
  markPrivacyConfigured,
  markCommunityJoined,
  markPetPhotoAdded,
  markMedicalRecordAdded,
  markProfileCompleted,
} from '../lib/onboardingService';

// Circumference of SVG circle with r=16 in a 40×40 viewBox
const CIRCUMFERENCE = 2 * Math.PI * 16; // ≈ 100.53

/** Progress ring color class based on completed count. */
function ringColorClass(count: number): string {
  if (count >= 7) return 'text-emerald-500';
  if (count >= 4) return 'text-amber-500';
  return 'text-neutral-400 dark:text-neutral-500';
}

/** Counter text color class matching ring. */
function counterColorClass(count: number): string {
  if (count >= 7) return 'text-emerald-600 dark:text-emerald-400';
  if (count >= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-neutral-500 dark:text-neutral-400';
}

interface GettingStartedGuideProps {
  onComplete: () => void;
  onStepComplete?: () => void; // per-step confetti callback
}

export function GettingStartedGuide({ onComplete, onStepComplete }: GettingStartedGuideProps) {
  const { pets } = usePets();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const ob = useOnboarding(user?.uid ?? null);

  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem('petbase-guide-expanded') !== 'false';
  });

  // Auto-detect steps that are completed by existing data
  useEffect(() => {
    if (!user) return;

    // add-pet: derived from PetContext
    if (pets.length > 0 && !ob.isStepCompleted('add-pet')) {
      ob.markStepCompleted('add-pet');
    }

    // add-pet-photo: any pet has an avatar/photo
    if (pets.some((p) => p.avatarUrl || p.photoUrl) && !ob.isStepCompleted('add-pet-photo')) {
      ob.markStepCompleted('add-pet-photo');
    }

    // add-medical-record: any pet has medical records
    if (pets.some((p) => p.medicalRecords && p.medicalRecords.length > 0) && !ob.isStepCompleted('add-medical-record')) {
      ob.markStepCompleted('add-medical-record');
    }

    // complete-profile: user has address + avatar
    if (profile && profile.address && profile.avatarUrl && !ob.isStepCompleted('complete-profile')) {
      ob.markStepCompleted('complete-profile');
    }
  }, [pets, profile, user, ob.isStepCompleted, ob.markStepCompleted]);

  // Track previous completed count for per-step confetti
  const [prevCount, setPrevCount] = useState(ob.completedCount);
  useEffect(() => {
    if (ob.completedCount > prevCount && prevCount > 0 && onStepComplete) {
      onStepComplete();
    }
    setPrevCount(ob.completedCount);
  }, [ob.completedCount, prevCount, onStepComplete]);

  const isDone = useCallback(
    (id: string) => ob.isStepCompleted(id) || ob.isStepSkipped(id),
    [ob.isStepCompleted, ob.isStepSkipped],
  );

  const completedCount = ob.completedCount;
  const allComplete = completedCount === TOTAL_STEPS;

  const handleStepClick = (step: typeof STEPS[number]) => {
    if (step.path) {
      navigate(step.path, { state: step.state });
    }
  };

  const handleSkip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    ob.markStepSkipped(id);
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
      ob.markGuideCompleted();
      onComplete();
    }, 1400);
    return () => clearTimeout(timer);
  }, [allComplete, onComplete, ob.markGuideCompleted]);

  const progressDash = (completedCount / TOTAL_STEPS) * CIRCUMFERENCE;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Circular progress ring with color transitions */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20" cy="20" r="16"
                fill="none" strokeWidth="3"
                className="text-neutral-100 dark:text-neutral-700"
                stroke="currentColor"
              />
              <circle
                cx="20" cy="20" r="16"
                fill="none" strokeWidth="3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray={`${progressDash} ${CIRCUMFERENCE}`}
                className={`${ringColorClass(completedCount)} transition-all duration-500`}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${counterColorClass(completedCount)}`}>
              {completedCount}/{TOTAL_STEPS}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-neutral-900 dark:text-neutral-100">
                {allComplete ? 'All done! Great work.' : 'Getting Started'}
              </p>
              {!allComplete && (
                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                  {LEVEL_LABELS[ob.petParentLevel]}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {ob.milestoneCopy}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />
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
            <div className="border-t border-neutral-100 dark:border-neutral-700 px-5 pb-5 pt-4 space-y-2">
              {STEPS.map((step) => {
                const completed = ob.isStepCompleted(step.id);
                const skipped = ob.isStepSkipped(step.id);
                const finished = completed || skipped;
                return (
                  <div key={step.id} className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-colors ${finished ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/40'}`}>
                    <button
                      type="button"
                      onClick={() => !finished && handleStepClick(step)}
                      className="flex items-start gap-3 flex-1 text-left"
                    >
                      {completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : skipped ? (
                        <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-neutral-300 dark:text-neutral-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${finished ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
                          {step.label}
                          {skipped && <span className="ml-1.5 text-xs font-normal no-underline">(skipped)</span>}
                        </p>
                        {!finished && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
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
                        className="p-1 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0 mt-0.5"
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
