import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

const SHORTCUT_CATEGORIES = [
  {
    title: 'General',
    shortcuts: [
      { key: '?', label: 'Show keyboard shortcuts' },
      { key: 'Esc', label: 'Close modal / panel' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'g h', label: 'Go to Dashboard' },
      { key: 'g p', label: 'Go to Pets' },
      { key: 'g c', label: 'Go to Community' },
      { key: 'g m', label: 'Go to Messages' },
      { key: 'g k', label: 'Go to Cards' },
      { key: 'g s', label: 'Go to Search' },
    ],
  },
];

// Flat list for the hook logic (unused but kept for reference)
const _SHORTCUTS = SHORTCUT_CATEGORIES.flatMap(c => c.shortcuts);

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isInputFocused()) return;

    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setHelpOpen(v => !v);
      return;
    }

    if (e.key === 'Escape') {
      setHelpOpen(false);
      setPendingG(false);
      return;
    }

    // "g" prefix for navigation chord
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !pendingG) {
      setPendingG(true);
      setTimeout(() => setPendingG(false), 1000);
      return;
    }

    if (pendingG) {
      setPendingG(false);
      switch (e.key) {
        case 'h': navigate('/'); break;
        case 'p': navigate('/pets'); break;
        case 'c': navigate('/community'); break;
        case 'm': navigate('/messages'); break;
        case 'k': navigate('/pets?openCards=true'); break;
        case 's': navigate('/search'); break;
      }
    }
  }, [navigate, pendingG]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { helpOpen, setHelpOpen };
}

export function ShortcutsHelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header with gradient icon */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-tertiary to-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-on-primary">keyboard</span>
            </div>
            <h2
              className="text-lg font-semibold text-on-surface"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Shortcut categories */}
        <div className="p-4 space-y-5">
          {SHORTCUT_CATEGORIES.map(category => (
            <div key={category.title}>
              <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                {category.title}
              </h3>
              <div className="space-y-1.5">
                {category.shortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-on-surface-variant">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.key.split(' ').map(k => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 text-xs font-mono bg-surface-container text-on-surface rounded border border-outline-variant border-b-2 border-b-outline-variant/80 min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function KeyboardShortcutsProvider() {
  const { helpOpen, setHelpOpen } = useKeyboardShortcuts();

  return (
    <AnimatePresence>
      {helpOpen && <ShortcutsHelpModal onClose={() => setHelpOpen(false)} />}
    </AnimatePresence>
  );
}
