import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

const TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;

interface CardDetailSectionProps {
  id: string;         // unique id for ARIA (no localStorage — just for aria-controls)
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  compact?: boolean;  // tighter padding for multi-pet density
  children: ReactNode;
}

export function CardDetailSection({ id, title, icon, defaultOpen = false, compact = false, children }: CardDetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-stone-100 dark:border-stone-700 last:border-0">
      <button
        type="button"
        id={`${id}-trigger`}
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        className={`w-full flex items-center gap-3 text-left hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${compact ? 'px-3 py-2 min-h-[44px]' : 'px-6 py-4 min-h-[44px]'}`}
      >
        {icon}
        <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100 text-sm">
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={TRANSITION}
          className="motion-safe:block"
        >
          <ChevronDown className="w-4 h-4 text-stone-400 dark:text-stone-500" />
        </motion.span>
      </button>

      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
      >
        <motion.div
          initial={false}
          animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={TRANSITION}
          style={{ overflow: 'hidden' }}
          className="motion-safe:block"
        >
          <div className={compact ? 'px-3 pb-3' : 'px-6 pb-4'}>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
