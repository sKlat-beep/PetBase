import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { submitReport, type Report } from '../../lib/reportService';

const REASONS = [
  'Harassment',
  'Spam',
  'Inappropriate content',
  'False information',
  'Other',
] as const;

type Reason = typeof REASONS[number];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: Report['targetType'];
  targetId: string;
  groupId?: string;
  parentPostId?: string;
}

export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  groupId,
  parentPostId,
}: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setReason(null);
      setDetail('');
      setSubmitting(false);
      setSubmitted(false);
      setError(null);
      setTimeout(() => firstFocusableRef.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus close button when moving to confirmation screen
  useEffect(() => {
    if (submitted) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [submitted]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Allow Escape only on confirmation screen or when form is empty
      if (submitted || (!reason && !detail)) {
        onClose();
      }
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [submitted, reason, detail, onClose]);

  async function handleSubmit() {
    if (!reason || !user || !targetId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({
        reporterUid: user.uid,
        targetType,
        targetId,
        ...(groupId ? { groupId } : {}),
        ...(parentPostId ? { parentPostId } : {}),
        reason,
        ...(detail.trim() ? { detail: detail.trim() } : {}),
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onMouseDown={() => { if (submitted || (!reason && !detail)) onClose(); }}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full sm:max-w-sm bg-surface-container
                       border border-outline-variant shadow-2xl
                       rounded-t-2xl sm:rounded-2xl overflow-hidden z-10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-outline-variant shrink-0">
              <h2
                id="report-modal-title"
                className="text-base font-bold text-on-surface flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-500" aria-hidden="true">flag</span>
                Report {targetType === 'user' ? 'User' : targetType === 'post' ? 'Post' : targetType === 'comment' ? 'Comment' : 'Content'}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close report dialog"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
                           text-on-surface-variant hover:text-on-surface
                           hover:bg-surface-container-high transition-colors
                           focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {submitted ? (
                /* Confirmation screen */
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span className="material-symbols-outlined text-[48px] text-primary" aria-hidden="true">check_circle</span>
                  <div>
                    <p className="font-semibold text-on-surface">Report submitted</p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Our team will review it.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl text-sm font-medium
                               bg-primary text-on-primary hover:bg-primary/90
                               transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Form screen */
                <>
                  <p className="text-sm text-on-surface-variant">
                    Why are you reporting this {targetType === 'user' ? 'user' : 'content'}?
                  </p>

                  {/* Reason selector */}
                  <div className="space-y-2" role="radiogroup" aria-label="Report reason">
                    {REASONS.map((r, i) => (
                      <button
                        key={r}
                        ref={i === 0 ? firstFocusableRef : undefined}
                        role="radio"
                        aria-checked={reason === r}
                        onClick={() => setReason(r)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors
                                    focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
                                    ${reason === r
                                      ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline'
                                    }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Detail field */}
                  <div>
                    <label
                      htmlFor="report-detail"
                      className="block text-xs font-medium text-on-surface-variant mb-1.5"
                    >
                      Additional details <span className="font-normal text-on-surface-variant">(optional)</span>
                    </label>
                    <textarea
                      id="report-detail"
                      value={detail}
                      onChange={e => setDetail(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Describe the issue…"
                      className="w-full text-sm rounded-xl border border-outline-variant
                                 bg-surface-container-low text-on-surface
                                 placeholder-on-surface-variant px-3 py-2.5 resize-none
                                 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      disabled={submitting}
                    />
                    <p className="text-right text-xs text-on-surface-variant mt-0.5">{detail.length}/500</p>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-error bg-error-container rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                               bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.97]
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-all focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                  >
                    {submitting && <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden="true">progress_activity</span>}
                    Submit Report
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
