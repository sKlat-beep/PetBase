import { useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Pet } from '../../types/pet';

interface QrOverlayProps {
  cardId: string;
  pet: Pet;
  expiresLabel: string;
  onClose: () => void;
}

export function QrOverlay({ cardId, pet, expiresLabel, onClose }: QrOverlayProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const url = `${window.location.origin}/cards/view/${cardId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`QR code for ${pet.name}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Close QR overlay"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pet info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{pet.name}</h2>
          {pet.breed && (
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{pet.breed}</p>
          )}
        </div>

        {/* QR Code — large, scannable */}
        <div className="bg-white p-4 rounded-2xl">
          <QRCode value={url} size={240} level="H" includeMargin />
        </div>

        {/* Expiry + instructions */}
        <div className="text-center space-y-1">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Scan to view pet card
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Expires {expiresLabel}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
