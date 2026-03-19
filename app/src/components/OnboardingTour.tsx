import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';

interface TourStep {
  title: string;
  description: string;
  icon: string; // Material Symbols icon name
  path: string;
  targetSelector?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to PetBase!',
    description: "Let's take a quick tour of the key features. You can skip anytime.",
    icon: 'waving_hand',
    path: '/',
  },
  {
    title: 'Add Your Pets',
    description: 'Start by creating profiles for your furry companions. Track their health, vaccines, and more.',
    icon: 'pets',
    path: '/pets',
    targetSelector: '[aria-label="Add Pet"]',
  },
  {
    title: 'Smart Messaging',
    description: 'Chat with other pet parents, share photos, and coordinate playdates in real time.',
    icon: 'chat',
    path: '/messages',
    targetSelector: '[href="/messages"]',
  },
  {
    title: 'Join the Community',
    description: 'Find groups for your pet type, discover events, and connect with other pet parents nearby.',
    icon: 'groups',
    path: '/community',
  },
  {
    title: 'Health Tracking',
    description: 'Keep track of vaccines, medications, vet visits, and daily wellness all in one place.',
    icon: 'monitor_heart',
    path: '/',
  },
  {
    title: 'Privacy & Encryption',
    description: 'Your pet data is end-to-end encrypted. Only you and your family can see sensitive health info.',
    icon: 'encrypted',
    path: '/settings',
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
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (current.path) {
      navigate(current.path);
    }
  }, [step, current.path, navigate]);

  // Compute spotlight position from target selector
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!current.targetSelector) {
      setSpotlight(null);
      return;
    }

    // Delay to let navigation settle
    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => {
        const el = document.querySelector(current.targetSelector!);
        if (el) {
          const rect = el.getBoundingClientRect();
          const pad = 8;
          setSpotlight({
            x: rect.left - pad,
            y: rect.top - pad,
            w: rect.width + pad * 2,
            h: rect.height + pad * 2,
          });
        } else {
          setSpotlight(null);
        }
      });
    }, 300);

    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [step, current.targetSelector]);

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
    <div className="fixed inset-0 z-[60]">
      {/* SVG mask overlay */}
      <svg className="absolute inset-0 w-full h-full" onClick={handleFinish}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x}
                y={spotlight.y}
                width={spotlight.w}
                height={spotlight.h}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.85)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Glass tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-md z-10"
        >
          <div className="glass-morphism rounded-[1.5rem] p-6 shadow-2xl">
            {/* Step icon */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-container to-tertiary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-on-primary text-2xl">
                {current.icon}
              </span>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-on-surface mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
              {current.title}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
              {current.description}
            </p>

            {/* Progress pills */}
            <div className="flex gap-1.5 mb-5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'bg-primary-container w-8'
                      : i < step
                        ? 'bg-primary-container/40 w-4'
                        : 'bg-outline-variant w-4'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleFinish}
                className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Skip Tour
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={handlePrev}
                    className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    aria-label="Previous step"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                >
                  {step === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                  {step < TOUR_STEPS.length - 1 && (
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
