/**
 * VerificationModal — Post-redirect verification.
 *
 * Triggered via visibilitychange when user returns within 30 min of a Yelp redirect.
 * Asks "Did [Service Type] work for [Pet Name]?" with optional business name input.
 */

import { useState } from 'react';
import { motion } from 'motion/react';

interface VerificationModalProps {
  petName: string;
  serviceType: string;
  onClose: () => void;
}

export function VerificationModal({ petName, serviceType, onClose }: VerificationModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleResponse = (worked: boolean) => {
    if (worked && businessName.trim()) {
      // Future: save to users/{uid}/verifiedServices/{docId}
      // For now, just log the verification
      console.info('[Orchestrator] Verification:', {
        petName,
        serviceType,
        businessName: businessName.trim(),
        worked,
        timestamp: Date.now(),
      });
    }
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-sm p-6"
      >
        {submitted ? (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-secondary text-4xl mb-2 block">check_circle</span>
            <p className="text-sm font-medium text-on-surface">Thanks for the feedback!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container">rate_review</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">How did it go?</h3>
                <p className="text-xs text-on-surface-variant">
                  Did {serviceType.toLowerCase()} work for {petName}?
                </p>
              </div>
            </div>

            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Business name (optional)"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container transition-all mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleResponse(true)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-lg">thumb_up</span>
                Yes
              </button>
              <button
                onClick={() => handleResponse(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-medium text-sm hover:bg-surface-container-high transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-lg">thumb_down</span>
                No
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2.5 rounded-xl text-on-surface-variant/60 text-xs hover:text-on-surface-variant transition-colors min-h-[44px]"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
