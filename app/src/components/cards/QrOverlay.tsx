import { useEffect, useRef, useCallback, useState } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { motion } from 'motion/react';
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`QR code for ${pet.name}`}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 bg-surface/95" />
      <div
        className="absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--primary-container)' }}
      />
      <div
        className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--tertiary)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, var(--surface) 100%)' }}
      />

      {/* Content panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-card relative z-10 max-w-md w-full mx-4 p-8 flex flex-col items-center gap-6"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          aria-label="Close QR overlay"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium uppercase tracking-widest text-primary-container">
            Secure Access
          </span>
          <h2 className="text-2xl font-bold text-on-surface text-glow">
            Digital ID Pass
          </h2>
        </div>

        {/* QR code with gradient border + glow */}
        <div className="relative flex items-center justify-center">
          {/* Glow effect behind */}
          <div
            className="absolute inset-0 blur-3xl opacity-20 rounded-[2rem]"
            style={{ background: 'var(--primary-container)' }}
          />

          {/* Gradient border wrapper */}
          <div className="qr-gradient-border relative">
            <div ref={qrRef} className="bg-white rounded-[calc(2rem-3px)] p-5">
              <QRCode value={url} size={220} level="H" includeMargin />
            </div>
          </div>

          {/* Verified badge */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-morphism flex items-center gap-1.5 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-primary-container text-sm">verified</span>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Verified Pet
              </span>
            </div>
          </div>
        </div>

        {/* Pet info */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <h3 className="text-3xl font-bold text-on-surface text-glow">
            {pet.name}
          </h3>
          {pet.breed && (
            <p className="text-sm text-on-surface-variant">
              {pet.breed}
            </p>
          )}
          <span className="text-xs text-on-surface-variant/70 mt-0.5">
            Medical Hub Access
          </span>
        </div>

        {/* Timer chip */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container/15 border border-primary-container/25">
          <span className="material-symbols-outlined text-primary-container text-base">timer</span>
          <span className="text-xs font-medium text-primary-container">
            Expires {expiresLabel}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full mt-1">
          {/* Share Access Link — primary CTA */}
          {canShare() ? (
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-2xl bg-primary text-on-primary font-semibold text-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              Share Access Link
            </button>
          ) : (
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-2xl font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${
                copied
                  ? 'bg-tertiary/20 text-tertiary'
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {copied ? 'check_circle' : 'link'}
              </span>
              {copied ? 'Link Copied!' : 'Share Access Link'}
            </button>
          )}

          {/* Secondary actions row */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Download
            </button>
            {canShare() && (
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${
                  copied
                    ? 'bg-tertiary/20 text-tertiary'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {copied ? 'check_circle' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span className="material-symbols-outlined text-base">print</span>
              Print
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded-lg px-4 py-2"
          >
            Close
          </button>
        </div>
      </motion.div>

      <style>{`
        .qr-gradient-border {
          background: linear-gradient(135deg, var(--primary-container), var(--tertiary));
          padding: 3px;
          border-radius: 2rem;
        }
      `}</style>
    </div>
  );
}
