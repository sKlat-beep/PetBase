import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: '?', label: 'Show keyboard shortcuts' },
  { key: 'g h', label: 'Go to Dashboard' },
  { key: 'g p', label: 'Go to Pets' },
  { key: 'g c', label: 'Go to Community' },
  { key: 'g m', label: 'Go to Messages' },
  { key: 'g k', label: 'Go to Cards' },
  { key: 'g s', label: 'Go to Search' },
  { key: 'Esc', label: 'Close modal / panel' },
] as const;

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
        case 'k': navigate('/cards'); break;
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
        className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-stone-600 dark:text-stone-300">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.key.split(' ').map(k => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 text-xs font-mono bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded border border-stone-200 dark:border-stone-600"
                  >
                    {k}
                  </kbd>
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
