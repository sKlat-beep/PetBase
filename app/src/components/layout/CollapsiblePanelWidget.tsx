import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface CollapsiblePanelWidgetProps {
  id: string;           // used for localStorage persistence key
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean; // default: true
}

export function CollapsiblePanelWidget({ id, title, icon, badge, children, defaultExpanded = true }: CollapsiblePanelWidgetProps) {
  const storageKey = `petbase-rpanel-${id}`;
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : defaultExpanded;
    } catch { return defaultExpanded; }
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try { localStorage.setItem(storageKey, String(next)); } catch {}
  };

  return (
    <div className="bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50/60 dark:hover:bg-neutral-700/40 transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {icon}
          {title}
        </span>
        {badge}
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
        }
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
