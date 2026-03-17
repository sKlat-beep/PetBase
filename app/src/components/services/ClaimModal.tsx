import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import type { ServiceResult } from '../../utils/serviceApi';
import { useAuth } from '../../contexts/AuthContext';
import { submitServiceClaim } from '../../lib/firestoreService';

interface ClaimModalProps {
  service: ServiceResult;
  onClose: () => void;
}

export function ClaimModal({ service, onClose }: ClaimModalProps) {
  const { user } = useAuth() as { user: { uid: string } | null };
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !businessEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitServiceClaim({
        serviceId: service.id,
        claimedByUid: user.uid,
        businessEmail: businessEmail.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });
      setStep('done');
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="claim-modal-title" className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <h2 id="claim-modal-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Claim Listing</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'form' ? (
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Claiming <strong className="text-neutral-700 dark:text-neutral-200">{service.name}</strong>. We'll verify and reach out within 2–3 business days.</p>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">Business email *</label>
              <input value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} type="email"
                className="w-full px-3 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                className="w-full px-3 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">Additional notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
            <button onClick={() => void handleSubmit()} disabled={!businessEmail.trim() || submitting}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40">
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        ) : (
          <div className="px-4 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Claim submitted!</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">We'll review your request and reach out within 2–3 business days.</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
