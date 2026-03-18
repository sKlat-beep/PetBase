import { useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldAlert, Activity, ExternalLink, X, SearchX } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
        className="bg-white/75 dark:bg-neutral-900/75 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30 border border-white/20 dark:border-white/10 w-full max-w-sm overflow-hidden"
      >
        <div className="bg-rose-600 p-5">
          <div className="flex items-center justify-between">
            <h2 id="emergency-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" /> Emergency Assistance
            </h2>
            <button
              onClick={onClose}
              aria-label="Close emergency assistance"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white rounded-lg motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-rose-100 text-sm mt-1">Tap a service below to get immediate help.</p>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={() => { onFindVet(); onClose(); }}
            className="w-full flex items-center gap-4 bg-rose-50/80 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 backdrop-blur-sm border border-rose-200/60 dark:border-rose-900/50 p-4 rounded-2xl motion-safe:transition-colors text-left"
          >
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-100 text-sm">Nearest 24/7 ER Vet</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">Find emergency veterinary care near you</p>
            </div>
          </button>
          <button
            onClick={() => { onReportLost(); onClose(); }}
            className="w-full flex items-center gap-4 bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 backdrop-blur-sm border border-amber-200/60 dark:border-amber-900/50 p-4 rounded-2xl motion-safe:transition-colors text-left"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0">
              <SearchX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100 text-sm">Report Lost Pet</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Alert your community about a missing pet</p>
            </div>
          </button>
          <a
            href="https://www.aspca.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-900/50 p-4 rounded-2xl motion-safe:transition-colors text-left block"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0">
              <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100 text-sm">ASPCA Poison Control</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">aspca.org · Available 24/7</p>
            </div>
          </a>
          <a
            href="https://www.petpoisonhelpline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-900/50 p-4 rounded-2xl motion-safe:transition-colors text-left block"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0">
              <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100 text-sm">Pet Poison Helpline</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">petpoisonhelpline.com · Available 24/7</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
