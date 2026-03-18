import React, { useState, useCallback, useEffect } from 'react';
import { Share2, QrCode, ShieldOff, RotateCcw, RefreshCw, Pencil, Download, Check } from 'lucide-react';
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
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700/40'
          }`}
        >
          {pet.image ? (
            <img src={pet.image} alt={pet.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white/80" style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}>
              {pet.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {pet.name} — {isPermanentlyRevoked ? 'Access Log' : TEMPLATE_LABELS[card.template]}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {status === 'active'
                ? timeUntilExpiry(card.expiresAt)
                : status === 'expired' ? 'Expired'
                : isPermanentlyRevoked ? 'Permanently Logged' : '⛔ Revoked'}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-emerald-500' : status === 'expired' ? 'bg-neutral-300' : 'bg-rose-500'}`} />
        </button>

        {isStale && onUpdate && (
          <button
            onClick={e => { e.stopPropagation(); onUpdate(); }}
            title="Pet info has changed — click to update this card"
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-xs font-medium border border-amber-200 dark:border-amber-800"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Update
          </button>
        )}
      </div>

      {selected && !isPermanentlyRevoked && status !== 'expired' && (
        <div className="flex items-center gap-1.5 pl-3 pt-1 pb-1 flex-wrap">
          {status === 'active' && (
            <>
              <button onClick={handleShare} className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors text-xs font-medium ${showCopied ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'}`}>
                {showCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {showCopied ? 'Copied!' : 'Share'}
              </button>
              <button onClick={() => setShowQrOverlay(true)} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-xs font-medium">
                <QrCode className="w-3.5 h-3.5" /> QR
              </button>
              <button onClick={handleDownloadCard} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-xs font-medium disabled:opacity-50">
                <Download className="w-3.5 h-3.5" /> {downloading ? 'Saving...' : 'Download'}
              </button>
              {onEdit && (
                <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-xs font-medium">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </>
          )}
          {status === 'active' && onRevoke && (
            <button onClick={onRevoke} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors text-xs font-medium">
              <ShieldOff className="w-3.5 h-3.5" /> Revoke
            </button>
          )}
          {status === 'revoked' && timeLeft > 0 && onUndoRevoke && (
            <button onClick={onUndoRevoke} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-xs font-medium">
              <RotateCcw className="w-3.5 h-3.5" /> Undo ({formatTimeLeft(timeLeft)})
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
