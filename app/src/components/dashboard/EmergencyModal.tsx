import { useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface EmergencyModalProps {
  onClose: () => void;
  onFindVet: () => void;
  onReportLost: () => void;
}

export default function EmergencyModal({ onClose, onFindVet, onReportLost }: EmergencyModalProps) {
  const prefersReduced = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, a, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4 bg-black/95 backdrop-blur-lg"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      tabIndex={-1}
    >
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={prefersReduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="glass-morphism rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-error p-5">
          <div className="flex items-center justify-between">
            <h2 id="emergency-modal-title" className="text-xl font-bold text-on-error flex items-center gap-2">
              <div className="w-9 h-9 rounded-full border-2 border-on-error/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">emergency</span>
              </div>
              Emergency Assistance
            </h2>
            <button
              onClick={onClose}
              aria-label="Close emergency assistance"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-on-error/70 hover:text-on-error rounded-lg motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error/50"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
            </button>
          </div>
          <p className="text-on-error/80 text-sm mt-1">Tap a service below to get immediate help.</p>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          {/* Find Emergency Vet */}
          <button
            onClick={() => { onFindVet(); onClose(); }}
            className="w-full flex items-center gap-4 bg-error-container/60 hover:bg-error-container/80 border border-error/20 p-4 rounded-2xl motion-safe:transition-colors text-left"
          >
            <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-on-error-container" aria-hidden="true">monitor_heart</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-sm">Nearest 24/7 ER Vet</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Find emergency veterinary care near you</p>
            </div>
          </button>

          {/* Report Lost Pet */}
          <button
            onClick={() => { onReportLost(); onClose(); }}
            className="w-full flex items-center gap-4 bg-secondary-container/40 hover:bg-secondary-container/60 border border-secondary/20 p-4 rounded-2xl motion-safe:transition-colors text-left"
          >
            <div className="w-10 h-10 bg-secondary-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-on-secondary-container" aria-hidden="true">person_search</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-sm">Report Lost Pet</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Alert your community about a missing pet</p>
            </div>
          </button>

          {/* ASPCA Poison Control */}
          <a
            href="https://www.aspca.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-surface-container-high/40 hover:bg-surface-container-high/60 border border-outline-variant/30 p-4 rounded-2xl motion-safe:transition-colors text-left block"
          >
            <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-on-surface-variant" aria-hidden="true">open_in_new</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-sm">ASPCA Poison Control</p>
              <p className="text-xs text-on-surface-variant mt-0.5">aspca.org · Available 24/7</p>
            </div>
          </a>

          {/* Pet Poison Helpline */}
          <a
            href="https://www.petpoisonhelpline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-surface-container-high/40 hover:bg-surface-container-high/60 border border-outline-variant/30 p-4 rounded-2xl motion-safe:transition-colors text-left block"
          >
            <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-on-surface-variant" aria-hidden="true">open_in_new</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-sm">Pet Poison Helpline</p>
              <p className="text-xs text-on-surface-variant mt-0.5">petpoisonhelpline.com · Available 24/7</p>
            </div>
          </a>
        </div>

        {/* Emergency Hotline */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-2 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-base text-error animate-pulse" aria-hidden="true">call</span>
            <span>ASPCA Animal Poison Control: <strong className="text-on-surface">(888) 426-4435</strong></span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
