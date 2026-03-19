import { useState } from 'react';
import { motion } from 'motion/react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import { serialiseTelemetryLog } from '../utils/telemetry';

type FeedbackType = 'Feedback' | 'Report Issue/Bug';

interface FeedbackModalProps {
  userEmail?: string;
  onClose: () => void;
}

export function FeedbackModal({ userEmail, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('Feedback');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const functions = getFunctions(app);
      const sendReport = httpsCallable(functions, 'sendReport');
      await sendReport({
        type: type === 'Report Issue/Bug' ? 'bug' : 'feedback',
        message: message.trim(),
        userEmail: userEmail ?? 'anonymous',
        log: await serialiseTelemetryLog(),
      });
      setSent(true);
    } catch {
      setError('Could not send your report. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="glass-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary">chat_bubble</span>
            <h2
              id="feedback-modal-title"
              className="text-lg font-semibold text-on-surface"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              Feedback
            </h2>
            {/* Live Beta badge */}
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-tertiary to-primary text-on-primary">
              Live Beta
            </span>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-[48px] text-primary">check_circle</span>
            <p className="font-semibold text-on-surface">Thanks for your message!</p>
            <p className="text-sm text-on-surface-variant">Your {type === 'Report Issue/Bug' ? 'bug report' : 'feedback'} has been received.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 bg-primary-container text-on-primary-container rounded-xl font-medium text-sm transition hover:brightness-110">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Idea / Bug toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(['Feedback', 'Report Issue/Bug'] as FeedbackType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    type === t
                      ? 'border-primary bg-primary-container/30 text-on-primary-container'
                      : 'border-outline-variant text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {t === 'Report Issue/Bug' ? 'bug_report' : 'lightbulb'}
                  </span>
                  {t === 'Report Issue/Bug' ? 'Bug' : 'Idea'}
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                {type === 'Report Issue/Bug' ? 'Describe the issue' : 'Share your thoughts'}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                required
                placeholder={
                  type === 'Report Issue/Bug'
                    ? 'What happened? What did you expect to happen?'
                    : 'We\'d love to hear your thoughts, suggestions, or ideas...'
                }
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Screenshot attachment hint */}
            <button
              type="button"
              className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">attach_file</span>
              Attach screenshot (optional)
            </button>

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            <p className="text-xs text-on-surface-variant/60">
              {type === 'Report Issue/Bug'
                ? 'A diagnostic log will be included automatically to help us debug.'
                : 'Diagnostic info will be included to give context to your feedback.'}
            </p>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-sm font-semibold transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {sending ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
