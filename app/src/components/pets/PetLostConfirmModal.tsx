import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Pet } from '../../types/pet';

interface PetLostConfirmModalProps {
  isOpen: boolean;
  pet: Pet | null;
  mode: 'markLost' | 'markFound';
  onConfirm: () => void;
  onCancel: () => void;
}

export function PetLostConfirmModal({
  isOpen,
  pet,
  mode,
  onConfirm,
  onCancel,
}: PetLostConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'pet-lost-confirm-title';

  // Escape + Tab focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')
      );
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Focus confirm button on open
  useEffect(() => {
    if (isOpen) {
      // Defer so the motion animation doesn't swallow the focus
      const id = requestAnimationFrame(() => confirmRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  const isMarkLost = mode === 'markLost';

  return (
    <AnimatePresence>
      {isOpen && pet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-sm p-6 space-y-4 z-10"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isMarkLost
                    ? 'bg-rose-100 dark:bg-rose-900/40'
                    : 'bg-emerald-100 dark:bg-emerald-900/40'
                }`}
              >
                {isMarkLost ? (
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
            </div>

            {/* Title */}
            <h2
              id={titleId}
              className="text-lg font-bold text-neutral-900 dark:text-neutral-100 text-center"
            >
              {isMarkLost
                ? `Report ${pet.name} as Lost?`
                : `Mark ${pet.name} as Found?`}
            </h2>

            {/* Body */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
              {isMarkLost
                ? `A community alert will be sent to your area in 15 minutes. You can cancel the alert by marking ${pet.name} as found before then.`
                : `This will remove the community lost pet alert for ${pet.name}.`}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  isMarkLost
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isMarkLost ? 'Report Lost' : 'Mark Found'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
