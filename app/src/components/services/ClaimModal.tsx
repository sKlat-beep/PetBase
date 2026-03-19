import { useState } from 'react';
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
      <div role="dialog" aria-modal="true" aria-labelledby="claim-modal-title" className="bg-surface-container rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h2 id="claim-modal-title" className="text-sm font-semibold text-on-surface">Claim Listing</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {step === 'form' ? (
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-on-surface-variant">Claiming <strong className="text-on-surface">{service.name}</strong>. We'll verify and reach out within 2–3 business days.</p>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Business email *</label>
              <input value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} type="email"
                className="w-full px-3 py-2 rounded-xl text-sm border border-outline-variant bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                className="w-full px-3 py-2 rounded-xl text-sm border border-outline-variant bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Additional notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-xl text-sm border border-outline-variant bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            {error && <p className="text-xs text-error">{error}</p>}
            <button onClick={() => void handleSubmit()} disabled={!businessEmail.trim() || submitting}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-40">
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        ) : (
          <div className="px-4 py-8 flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-[40px] text-primary">check_circle</span>
            <h3 className="text-sm font-semibold text-on-surface">Claim submitted!</h3>
            <p className="text-xs text-on-surface-variant">We'll review your request and reach out within 2–3 business days.</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
