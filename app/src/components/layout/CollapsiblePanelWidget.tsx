import { useState } from 'react';
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
    <div className="glass-card overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container-high/40 motion-safe:transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {icon}
          {title}
        </span>
        {badge}
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0" aria-hidden="true">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
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
            <div className="px-4 pb-4 min-w-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
