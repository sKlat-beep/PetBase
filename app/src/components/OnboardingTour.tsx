import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

interface TourStep {
  title: string;
  description: string;
  path: string;
  targetSelector?: string; // CSS selector of element to highlight
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to PetBase!',
    description: "Let's take a quick tour of the key features. You can skip anytime.",
    path: '/',
  },
  {
    title: 'Add Your Pets',
    description: 'Start by creating profiles for your furry companions. Track their health, vaccines, and more.',
    path: '/pets',
    targetSelector: '[aria-label="Add Pet"]',
  },
  {
    title: 'Create Pet Cards',
    description: 'Generate shareable QR cards for vets, sitters, or emergencies with just the info you choose.',
    path: '/cards',
  },
  {
    title: 'Join the Community',
    description: 'Find groups for your pet type, discover events, and connect with other pet parents nearby.',
    path: '/community',
  },
  {
    title: 'Find Services',
    description: 'Search for top-rated vets, groomers, and sitters in your area with community reviews.',
    path: '/search',
  },
  {
    title: 'You\'re All Set!',
    description: 'Explore at your own pace. Check Settings to manage privacy, notifications, and family sharing.',
    path: '/',
  },
];

const TOUR_KEY = 'petbase-tour-completed';

export function useOnboardingTour() {
  const [active, setActive] = useState(false);

  const startTour = useCallback(() => setActive(true), []);
  const isCompleted = localStorage.getItem(TOUR_KEY) === 'true';

  return { active, setActive, startTour, isCompleted };
}

interface OnboardingTourProps {
  onClose: () => void;
}

export function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = TOUR_STEPS[step];

  useEffect(() => {
    if (current.path) {
      navigate(current.path);
    }
  }, [step, current.path, navigate]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleFinish = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleFinish} />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm pointer-events-auto"
        >
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{current.title}</h3>
              <button onClick={handleFinish} className="text-stone-400 hover:text-stone-600 -mt-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-4">
              {current.description}
            </p>

            {/* Progress dots + nav */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === step ? 'bg-emerald-500' : i < step ? 'bg-emerald-300' : 'bg-stone-200 dark:bg-stone-600'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={handlePrev}
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  {step === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                  {step < TOUR_STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
