import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Copy, Check, Phone, MapPin, User } from 'lucide-react';
import type { Pet } from '../../types/pet';

interface PetDocumentsPanelProps {
  pet: Pet;
  onEdit?: () => void;
}

export function PetDocumentsPanel({ pet, onEdit }: PetDocumentsPanelProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const galleryPhotos = (pet.gallery ?? []).filter(Boolean);
  const hasGallery = galleryPhotos.length > 0;
  const hasMicrochip = !!pet.microchipId;
  const ec = pet.emergencyContacts;
  const hasEmergencyContacts =
    !!ec && (!!ec.ownerPhone || !!ec.vetInfo || (ec.additionalContacts && ec.additionalContacts.length > 0));

  const isEmpty = !hasGallery && !hasMicrochip && !hasEmergencyContacts;

  // Fix 1: Keyboard support for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const gallery = pet.gallery?.filter(Boolean) ?? [];
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < gallery.length - 1) setLightboxIndex(lightboxIndex + 1);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, pet.gallery]);

  // Fix 3: Clipboard error handling
  function handleCopyMicrochip() {
    if (!pet.microchipId) return;
    navigator.clipboard.writeText(pet.microchipId!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable; silently ignore
    });
  }

  if (isEmpty) {
    return (
      <div className="text-center py-6 text-stone-500 dark:text-stone-400">
        <p className="text-sm mb-3">No photos or documents yet.</p>
        {/* Fix 4: Guard onEdit call */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-stone-900 dark:text-stone-100 font-semibold underline underline-offset-2"
          >
            Upload photos →
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Gallery */}
        {hasGallery && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-3">
              Gallery
            </p>
            <div className="columns-2 gap-3 space-y-3">
              {/* Fix 2: keyboard-activatable buttons; Fix 5: stable key using url */}
              {galleryPhotos.map((url, i) => (
                <button
                  type="button"
                  key={url || i}
                  className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer block w-full text-left"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`View ${pet.name} photo ${i + 1}`}
                >
                  <img
                    src={url}
                    alt={`${pet.name} photo ${i + 1}`}
                    className="w-full object-cover hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Microchip */}
        {hasMicrochip && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Microchip ID
              </p>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                Encrypted
              </span>
            </div>
            <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-700/50 rounded-xl px-4 py-3">
              <span className="flex-1 text-sm font-mono text-stone-700 dark:text-stone-300 break-all">
                {pet.microchipId}
              </span>
              <button
                onClick={handleCopyMicrochip}
                className="shrink-0 p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                aria-label="Copy microchip ID"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Emergency contacts */}
        {hasEmergencyContacts && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-3">
              Emergency Contacts
            </p>
            <div className="space-y-3">
              {/* Owner phone */}
              {ec!.ownerPhone && (
                <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-700/50 rounded-xl px-4 py-3">
                  <Phone className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Owner Phone</p>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{ec!.ownerPhone}</p>
                  </div>
                </div>
              )}

              {/* Vet info */}
              {ec!.vetInfo && (
                <div className="bg-stone-50 dark:bg-stone-700/50 rounded-xl px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                    <p className="text-xs text-stone-500 dark:text-stone-400">Veterinarian</p>
                  </div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{ec!.vetInfo.clinic}</p>
                  {ec!.vetInfo.name && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">Dr. {ec!.vetInfo.name}</p>
                  )}
                  {ec!.vetInfo.phone && (
                    <p className="text-xs text-stone-600 dark:text-stone-300">{ec!.vetInfo.phone}</p>
                  )}
                  {ec!.vetInfo.address && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">{ec!.vetInfo.address}</p>
                  )}
                </div>
              )}

              {/* Additional contacts — Fix 5: stable key using name+phone */}
              {ec!.additionalContacts && ec!.additionalContacts.map((contact) => (
                <div key={contact.name + contact.phone} className="flex items-center gap-3 bg-stone-50 dark:bg-stone-700/50 rounded-xl px-4 py-3">
                  <User className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{contact.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{contact.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox — Fix 1: role/aria-modal/aria-label added */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
        >
          <motion.img
            key={lightboxIndex}
            src={galleryPhotos[lightboxIndex]}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />

          {/* Prev button */}
          {lightboxIndex > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next button */}
          {lightboxIndex < galleryPhotos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
