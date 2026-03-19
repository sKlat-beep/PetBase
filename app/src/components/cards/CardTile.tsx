import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Pet } from '../../types/pet';
import type { PetCard } from '../../types/cardExtensions';
import { getCardStatus, TEMPLATE_LABELS, UNDO_WINDOW_MS, formatExpiry, timeUntilExpiry } from '../../types/cardExtensions';
import { canShare } from '../../utils/platform';
import { QrOverlay } from './QrOverlay';

export function CardTile({
  card, pet, selected, onSelect, isStale, onUpdate, onRevoke, onUndoRevoke, onCopied, onEdit,
}: {
  card: PetCard;
  pet: Pet;
  selected: boolean;
  onSelect: () => void;
  isStale?: boolean;
  onUpdate?: () => void;
  onRevoke?: () => void;
  onUndoRevoke?: () => void;
  onCopied?: () => void;
  onEdit?: () => void;
}) {
  const status = getCardStatus(card);
  const isPermanentlyRevoked = status === 'revoked' && card.revokedAt && Date.now() >= card.revokedAt + UNDO_WINDOW_MS;
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(() =>
    card.revokedAt ? Math.max(0, card.revokedAt + UNDO_WINDOW_MS - Date.now()) : 0
  );
  useEffect(() => {
    if (status === 'revoked' && card.revokedAt) {
      const iv = setInterval(() => setTimeLeft(Math.max(0, card.revokedAt! + UNDO_WINDOW_MS - Date.now())), 1000);
      return () => clearInterval(iv);
    }
  }, [status, card.revokedAt]);

  const formatTimeLeft = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/cards/view/${card.id}`;
    if (canShare()) {
      navigator.share({ title: `${pet.name}'s Card`, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 1500);
        onCopied?.();
      });
    }
  }, [card.id, pet.name, onCopied]);

  const handleDownloadCard = useCallback(async () => {
    const el = document.getElementById(`card-preview-${card.id}`) ?? document.querySelector('[data-card-preview]');
    if (!el) return;
    setDownloading(true);
    try {
      const { downloadElementAsImage } = await import('../../utils/exportImage');
      await downloadElementAsImage(el as HTMLElement, `${pet.name}-card.png`);
    } catch { /* silent */ } finally {
      setDownloading(false);
    }
  }, [card.id, pet.name]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          onClick={onSelect}
          className={`flex-1 flex items-center gap-3 p-3 rounded-xl transition-all border-2 text-left ${
            selected
              ? 'border-primary bg-primary-container'
              : 'border-transparent hover:border-outline-variant hover:bg-surface-container-low'
          }`}
        >
          {pet.image ? (
            <img src={pet.image} alt={pet.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-on-primary/80" style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}>
              {pet.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-on-surface truncate">
              {pet.name} — {isPermanentlyRevoked ? 'Access Log' : TEMPLATE_LABELS[card.template]}
            </p>
            <p className="text-xs text-on-surface-variant truncate">
              {status === 'active'
                ? timeUntilExpiry(card.expiresAt)
                : status === 'expired' ? 'Expired'
                : isPermanentlyRevoked ? 'Permanently Logged' : '⛔ Revoked'}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-primary' : status === 'expired' ? 'bg-outline-variant' : 'bg-error'}`} />
        </button>

        {isStale && onUpdate && (
          <button
            onClick={e => { e.stopPropagation(); onUpdate(); }}
            title="Pet info has changed — click to update this card"
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-xl bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 transition-colors text-xs font-medium border border-tertiary/30"
          >
            <span className="material-symbols-outlined text-[14px]">sync</span> Update
          </button>
        )}
      </div>

      {selected && !isPermanentlyRevoked && status !== 'expired' && (
        <div className="flex items-center gap-1.5 pl-3 pt-1 pb-1 flex-wrap">
          {status === 'active' && (
            <>
              <button onClick={handleShare} className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors text-xs font-medium ${showCopied ? 'bg-primary-container text-on-primary-container' : 'bg-primary-container/60 text-on-primary-container hover:bg-primary-container'}`}>
                {showCopied ? <span className="material-symbols-outlined text-[14px]">check</span> : <span className="material-symbols-outlined text-[14px]">share</span>}
                {showCopied ? 'Copied!' : 'Share'}
              </button>
              <button onClick={() => setShowQrOverlay(true)} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">qr_code_2</span> QR
              </button>
              <button onClick={handleDownloadCard} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs font-medium disabled:opacity-50">
                <span className="material-symbols-outlined text-[14px]">download</span> {downloading ? 'Saving...' : 'Download'}
              </button>
              {onEdit && (
                <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 transition-colors text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                </button>
              )}
            </>
          )}
          {status === 'active' && onRevoke && (
            <button onClick={onRevoke} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-error-container text-on-error-container hover:bg-error-container/80 transition-colors text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">shield_off</span> Revoke
            </button>
          )}
          {status === 'revoked' && timeLeft > 0 && onUndoRevoke && (
            <button onClick={onUndoRevoke} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 transition-colors text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">undo</span> Undo ({formatTimeLeft(timeLeft)})
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showQrOverlay && (
          <QrOverlay
            cardId={card.id}
            pet={pet}
            expiresLabel={formatExpiry(card.expiresAt)}
            onClose={() => setShowQrOverlay(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
