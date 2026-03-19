import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';

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
    <div className="border-b border-outline-variant last:border-0">
      <button
        type="button"
        id={`${storageKey}-trigger`}
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={`${storageKey}-panel`}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-surface-container transition-colors"
      >
        {icon}
        <span className="flex-1 font-semibold text-on-surface">
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={TRANSITION}
        >
          <span className="material-symbols-outlined text-base text-on-surface-variant">expand_more</span>
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
