import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flag, CheckCircle, Loader2 } from 'lucide-react';
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
            className="relative w-full sm:max-w-sm bg-white dark:bg-stone-900
                       border border-stone-200 dark:border-stone-700 shadow-2xl
                       rounded-t-2xl sm:rounded-2xl overflow-hidden z-10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
              <h2
                id="report-modal-title"
                className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
              >
                <Flag className="w-4 h-4 text-orange-500" aria-hidden="true" />
                Report {targetType === 'user' ? 'User' : targetType === 'post' ? 'Post' : targetType === 'comment' ? 'Comment' : 'Content'}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close report dialog"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
                           text-stone-400 hover:text-stone-600 dark:hover:text-stone-200
                           hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors
                           focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {submitted ? (
                /* Confirmation screen */
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">Report submitted</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      Our team will review it.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl text-sm font-medium
                               bg-emerald-500 text-white hover:bg-emerald-600
                               transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Form screen */
                <>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
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
                                      ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium'
                                      : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600'
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
                      className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5"
                    >
                      Additional details <span className="font-normal text-stone-400">(optional)</span>
                    </label>
                    <textarea
                      id="report-detail"
                      value={detail}
                      onChange={e => setDetail(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Describe the issue…"
                      className="w-full text-sm rounded-xl border border-stone-200 dark:border-stone-700
                                 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200
                                 placeholder-stone-400 px-3 py-2.5 resize-none
                                 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500"
                      disabled={submitting}
                    />
                    <p className="text-right text-[10px] text-stone-400 mt-0.5">{detail.length}/500</p>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                               bg-orange-500 text-white hover:bg-orange-600
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
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
