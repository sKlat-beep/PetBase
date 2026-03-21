import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { PetCard } from '../../types/cardExtensions';
import { getCardStatus, TEMPLATE_LABELS, UNDO_WINDOW_MS, formatExpiry } from '../../types/cardExtensions';
import type { Pet } from '../../types/pet';

interface CardActionDrawerProps {
  card: PetCard;
  pet: Pet;
  open: boolean;
  onClose: () => void;
  onQr: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onRevoke: () => void;
  onUndoRevoke?: () => void;
}

export function CardActionDrawer({
  card, pet, open, onClose, onQr, onDownload, onEdit, onRevoke, onUndoRevoke,
}: CardActionDrawerProps) {
  const prefersReduced = useReducedMotion();
  const status = getCardStatus(card);
  const isActive = status === 'active';
  const canUndo = status === 'revoked' && card.revokedAt && Date.now() < card.revokedAt + UNDO_WINDOW_MS;

  // iOS scroll lock
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Revoke confirmation
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const handleConfirmRevoke = useCallback(() => {
    onRevoke();
    onClose();
  }, [onRevoke, onClose]);

  // Reset confirm state when drawer closes
  useEffect(() => {
    if (!open) setConfirmingRevoke(false);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop scrim */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Actions for ${pet.name} card`}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-surface-container pb-[env(safe-area-inset-bottom)]"
            initial={{ y: prefersReduced ? 0 : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: prefersReduced ? 0 : '100%' }}
            transition={{ duration: prefersReduced ? 0 : 0.22, ease: 'easeOut' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 120) onClose();
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-outline-variant" />
            </div>

            <div className="px-4 pb-6">
              {/* Card header */}
              <div className="flex items-center gap-3 mb-4">
                {pet.image ? (
                  <img src={pet.image} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-on-primary/70"
                    style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}
                  >
                    {pet.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-on-surface truncate">{pet.name}</h3>
                  <p className="text-xs text-on-surface-variant">
                    {TEMPLATE_LABELS[card.template]} &middot; {status === 'active' ? `Expires ${formatExpiry(card.expiresAt)}` : status.charAt(0).toUpperCase() + status.slice(1)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1">
                {isActive && (
                  <ActionButton icon="qr_code_2" label="Show QR Code" onClick={() => { onClose(); onQr(); }} />
                )}
                <ActionButton icon="download" label="Download Card" onClick={() => { onClose(); onDownload(); }} />
                {isActive && (
                  <ActionButton icon="edit" label="Edit Card" onClick={() => { onClose(); onEdit(); }} />
                )}
                {isActive && !confirmingRevoke && (
                  <ActionButton icon="shield_off" label="Revoke Access" destructive onClick={() => setConfirmingRevoke(true)} />
                )}
                {isActive && confirmingRevoke && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-error-container/30 border border-error/20">
                    <span className="text-xs text-on-surface flex-1 pl-2">Revoke this card? Recipients will lose access.</span>
                    <button
                      onClick={handleConfirmRevoke}
                      className="px-3 py-2 min-h-[44px] rounded-lg bg-error text-on-error text-xs font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingRevoke(false)}
                      className="px-3 py-2 min-h-[44px] rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {canUndo && onUndoRevoke && (
                  <ActionButton icon="undo" label="Undo Revoke" onClick={() => { onUndoRevoke(); onClose(); }} />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionButton({
  icon, label, onClick, destructive = false,
}: {
  icon: string; label: string; onClick: () => void; destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
        destructive
          ? 'text-error hover:bg-error-container/30'
          : 'text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <span className={`material-symbols-outlined text-xl ${destructive ? 'text-error' : 'text-on-surface-variant'}`}>{icon}</span>
      {label}
    </button>
  );
}
