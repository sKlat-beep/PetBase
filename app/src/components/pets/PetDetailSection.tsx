import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

const TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;

interface PetDetailSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  storageKey: string;
  children: ReactNode;
}

export function PetDetailSection({
  title,
  icon,
  defaultOpen = false,
  storageKey,
  children,
}: PetDetailSectionProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const persisted = localStorage.getItem(storageKey);
      if (persisted !== null) return persisted === 'true';
    } catch {
      // localStorage unavailable (SSR, private browsing)
    }
    return defaultOpen;
  });

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch { /* ignore */ }
  }

  return (
    <div className="border-b border-stone-100 dark:border-stone-700 last:border-0">
      <button
        type="button"
        id={`${storageKey}-trigger`}
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={`${storageKey}-panel`}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
      >
        {icon}
        <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={TRANSITION}
        >
          <ChevronDown className="w-4 h-4 text-stone-400 dark:text-stone-500" />
        </motion.span>
      </button>

      {/* Always in DOM so aria-controls resolves */}
      <div
        id={`${storageKey}-panel`}
        role="region"
        aria-labelledby={`${storageKey}-trigger`}
      >
        <motion.div
          initial={false}
          animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={TRANSITION}
          style={{ overflow: 'hidden' }}
        >
          <div className="px-6 pb-4">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
