// Per petbase-system-instructions.md: advanced features that don't belong in the
// Getting Started checklist should surface here as recommendation banners.
import { useState } from 'react';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  cta: string;
  to: string;
  accentClasses: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'pet-cards',
    title: 'Share a Pet Card',
    description:
      'Create a shareable emergency or sitter profile your vet and caretakers can access instantly.',
    cta: 'Create a card',
    to: '/cards',
    accentClasses:
      'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-100 dark:border-emerald-900/30',
  },
  {
    id: 'community',
    title: 'Join the Community',
    description:
      'Connect with local pet parents, discover meetups, and get trusted advice from people who get it.',
    cta: 'Explore groups',
    to: '/community',
    accentClasses:
      'from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-100 dark:border-purple-900/30',
  },
  {
    id: 'services',
    title: 'Find Nearby Services',
    description:
      'Discover top-rated vets, groomers, and sitters in your area — all verified by PetBase.',
    cta: 'Search now',
    to: '/search',
    accentClasses:
      'from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 border-blue-100 dark:border-blue-900/30',
  },
  {
    id: 'profile-setup',
    title: 'Complete Your Profile',
    description:
      'Add your address and privacy preferences to unlock personalized local service matches.',
    cta: 'Go to settings',
    to: '/settings',
    accentClasses:
      'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-100 dark:border-amber-900/30',
  },
];

const DISMISSED_KEY = 'petbase-dismissed-recommendations';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function RecommendationBanner() {
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  const active = RECOMMENDATIONS.filter((r) => !dismissed.includes(r.id));

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  if (active.length === 0) return null;

  const current = active[0];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className={`bg-gradient-to-r ${current.accentClasses} rounded-2xl p-4 border flex items-center gap-3`}
      >
        <Sparkles className="w-5 h-5 text-neutral-400 dark:text-neutral-500 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
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

        <button
          type="button"
          onClick={() => dismiss(current.id)}
          className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Dismiss recommendation"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
