import { useState } from 'react';

interface VerificationModalProps {
  serviceName: string;
  petName: string;
  onSubmit: (accepted: boolean, notes?: string) => void;
  onClose: () => void;
}

/**
 * Post-redirect verification: "Did [Service] accept [Pet]?"
 * Shown after user returns from Yelp redirect to collect verified status.
 */
export function VerificationModal({ serviceName, petName, onSubmit, onClose }: VerificationModalProps) {
  const [notes, setNotes] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Service verification"
    >
      <div className="w-full max-w-sm bg-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold text-on-surface text-center">
          Did {serviceName} accept {petName}?
        </h2>
        <p className="text-sm text-on-surface-variant text-center">
          Help other pet owners by sharing your experience.
        </p>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes (e.g., 'They specialize in large breeds')"
          className="w-full rounded-xl bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
          maxLength={200}
        />

        <div className="flex gap-3">
          <button
            onClick={() => onSubmit(true, notes || undefined)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-sm hover:bg-primary/90 transition-colors active:scale-[0.97]"
          >
            Yes, accepted
          </button>
          <button
            onClick={() => onSubmit(false, notes || undefined)}
            className="flex-1 py-2.5 rounded-xl bg-error-container text-on-error-container font-medium text-sm hover:bg-error-container/80 transition-colors active:scale-[0.97]"
          >
            No, declined
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
