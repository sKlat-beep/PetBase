import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => cancelRef.current?.focus(), 50);
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onCancel(); return; }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onCancel]);

  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="relative w-full max-w-sm bg-surface border border-outline-variant shadow-2xl rounded-2xl overflow-hidden z-10"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 id="confirm-dialog-title" className="text-base font-bold text-on-surface">{title}</h2>
              <button
                onClick={onCancel}
                aria-label="Close"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p id="confirm-dialog-message" className="px-5 pb-5 text-sm text-on-surface-variant">{message}</p>
            <div className="flex gap-2 px-5 pb-5">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none ${isDanger ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
