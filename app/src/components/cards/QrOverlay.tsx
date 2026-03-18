import { useEffect, useRef, useCallback, useState } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { motion } from 'motion/react';
import { X, Download, Copy, Printer, Share2, Check } from 'lucide-react';
import type { Pet } from '../../types/pet';
import { canShare } from '../../utils/platform';

interface QrOverlayProps {
  cardId: string;
  pet: Pet;
  expiresLabel: string;
  onClose: () => void;
}

export function QrOverlay({ cardId, pet, expiresLabel, onClose }: QrOverlayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const url = `${window.location.origin}/cards/view/${cardId}`;

  const handleDownloadQr = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${pet.name}-qr.png`;
    a.click();
  }, [pet.name]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [url]);

  const handlePrint = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${pet.name} — QR Code</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif}
      img{max-width:300px}h2{margin:16px 0 4px}p{color:#666;font-size:14px}</style></head>
      <body><h2>${pet.name}</h2><p>Scan to view pet card</p><img src="${dataUrl}" /><p style="margin-top:12px;font-size:11px;color:#999">Expires ${expiresLabel}</p></body></html>
    `);
    win.document.close();
    win.print();
  }, [pet.name, expiresLabel]);

  const handleShare = useCallback(() => {
    if (canShare()) {
      navigator.share({ title: `${pet.name}'s Pet Card`, url });
    }
  }, [pet.name, url]);

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
        className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Close QR overlay"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pet avatar + info */}
        <div className="flex flex-col items-center gap-2">
          {pet.image ? (
            <img
              src={pet.image}
              alt={pet.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-600"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white/80"
              style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}
            >
              {pet.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{pet.name}</h2>
            {pet.breed && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{pet.breed}</p>
            )}
          </div>
        </div>

        {/* QR Code — large, scannable */}
        <div ref={qrRef} className="bg-white p-4 rounded-2xl">
          <QRCode value={url} size={240} level="H" includeMargin />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={handleDownloadQr}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl transition-colors text-xs font-medium ${
              copied
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {canShare() && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors text-xs font-medium"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
        </div>

        {/* Expiry */}
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Expires {expiresLabel}
        </p>
      </motion.div>
    </div>
  );
}
