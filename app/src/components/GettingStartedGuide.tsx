import { useState, useEffect } from 'react';
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
    if (pets.some((p) => p.image) && !ob.isStepCompleted('add-pet-photo')) {
      ob.markStepCompleted('add-pet-photo');
    }

    // add-medical-record: any pet has medical records
    if (pets.some((p) => p.medicalVisits && p.medicalVisits.length > 0) && !ob.isStepCompleted('add-medical-record')) {
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

  const completedCount = ob.completedCount;
  const allComplete = completedCount === TOTAL_STEPS;
  const progressPercent = (completedCount / TOTAL_STEPS) * 100;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-card w-full overflow-hidden rounded-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <span className="material-symbols-outlined text-primary-container text-2xl">
            auto_awesome
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="font-bold text-on-surface"
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {allComplete ? 'All done! Great work.' : 'GETTING STARTED'}
              </p>
              {!allComplete && (
                <span className="text-xs font-medium text-on-surface-variant">
                  {LEVEL_LABELS[ob.petParentLevel]}
                </span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {ob.milestoneCopy}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-2 w-full rounded-full bg-surface-container overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-tertiary) 100%)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            type="button"
            onClick={toggleExpanded}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container motion-safe:transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="material-symbols-outlined text-xl">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container motion-safe:transition-colors"
            title="Dismiss guide"
          >
            <span className="material-symbols-outlined text-xl">
              close
            </span>
          </button>
        </div>
      </div>

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
            <div className="border-t border-outline-variant/30 px-5 pb-5 pt-4">
              {/* 3-col grid on desktop, 1-col on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {STEPS.map((step) => {
                  const completed = ob.isStepCompleted(step.id);
                  const skipped = ob.isStepSkipped(step.id);
                  const finished = completed || skipped;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 px-3 py-3 rounded-xl motion-safe:transition-colors ${
                        finished
                          ? 'bg-secondary-container/20 border border-secondary/30'
                          : 'hover:bg-surface-container'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => !finished && handleStepClick(step)}
                        className="flex items-start gap-3 flex-1 text-left"
                      >
                        {completed ? (
                          <span className="material-symbols-outlined text-xl text-green-500 shrink-0 mt-0.5">
                            check_circle
                          </span>
                        ) : skipped ? (
                          <span className="material-symbols-outlined text-xl text-on-surface-variant shrink-0 mt-0.5">
                            check_circle
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-xl text-outline shrink-0 mt-0.5">
                            radio_button_unchecked
                          </span>
                        )}
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              finished
                                ? 'line-through text-on-surface-variant'
                                : 'text-on-surface'
                            }`}
                          >
                            {step.label}
                            {skipped && (
                              <span className="ml-1.5 text-xs font-normal no-underline">
                                (skipped)
                              </span>
                            )}
                          </p>
                          {!finished && (
                            <>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {step.description}
                              </p>
                              {step.path && (
                                <span className="text-xs font-medium text-primary mt-1 inline-block">
                                  Get started &rarr;
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                      {step.skippable && !finished && (
                        <button
                          type="button"
                          onClick={(e) => handleSkip(e, step.id)}
                          title="Skip this step"
                          className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container motion-safe:transition-colors shrink-0 mt-0.5"
                        >
                          <span className="material-symbols-outlined text-base">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-outline-variant/30 px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-sm align-middle mr-1">
                  stars
                </span>
                Earn <span className="font-semibold text-secondary">50 bonus points</span> by completing all steps
              </p>
              <button
                type="button"
                onClick={onComplete}
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface motion-safe:transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
