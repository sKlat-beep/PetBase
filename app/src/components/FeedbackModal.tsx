import { useState } from 'react';
import { X, MessageSquare, Bug, Send, CheckCircle } from 'lucide-react';
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
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <h2 id="feedback-modal-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Feedback / Report Issue</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="font-semibold text-neutral-800 dark:text-neutral-200">Thanks for your message!</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Your {type === 'Report Issue/Bug' ? 'bug report' : 'feedback'} has been received.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              {(['Feedback', 'Report Issue/Bug'] as FeedbackType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    type === t
                      ? t === 'Report Issue/Bug'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                        : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  {t === 'Report Issue/Bug' ? <Bug className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                  {t}
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
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
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <p className="text-xs text-neutral-400">
              {type === 'Report Issue/Bug'
                ? 'A diagnostic log will be included automatically to help us debug.'
                : 'Diagnostic info will be included to give context to your feedback.'}
            </p>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
