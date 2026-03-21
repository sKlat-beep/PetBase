import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PetCard, CardStatus } from '../../types/cardExtensions';
import { getCardStatus, TEMPLATE_LABELS, formatExpiry } from '../../types/cardExtensions';
import type { Pet } from '../../types/pet';
import type { PublicCardPetSnapshot } from '../../lib/firestoreService';

const TEMPLATE_BADGE_COLORS: Record<string, string> = {
  vet: 'bg-teal-600 text-white',
  sitter: 'bg-emerald-600 text-white',
  emergency: 'bg-rose-600 text-white',
  custom: 'bg-neutral-600 text-white',
};

interface CardGalleryTileProps {
  card: PetCard;
  pet: Pet;
  index: number;
  isStale?: boolean;
  onTap: () => void;
  onQr: () => void;
}

export function CardGalleryTile({ card, pet, index, isStale, onTap, onQr }: CardGalleryTileProps) {
  const prefersReduced = useReducedMotion();
  const status = getCardStatus(card);
  const isInactive = status === 'revoked' || status === 'expired';
  const snapshot = card.petSnapshot as PublicCardPetSnapshot | undefined;
  const image = snapshot?.image || pet.image;

  // Expiry label
  const expiryLabel = (() => {
    if (status !== 'active') return status === 'revoked' ? 'Revoked' : 'Expired';
    const daysLeft = Math.ceil((card.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 365 * 10) return 'Never expires';
    return `Expires ${formatExpiry(card.expiresAt)}`;
  })();
  const isExpiringSoon = status === 'active' && (card.expiresAt - Date.now()) <= 14 * 24 * 60 * 60 * 1000;

  // Multi-pet collage
  const isMultiPet = card.petId === 'multi-pet' || card.petId === 'all-pets';
  const multiPetImages = isMultiPet
    ? (card.multiPetConfig ?? []).slice(0, 3).map(cfg => cfg.petSnapshot?.image).filter(Boolean) as string[]
    : [];

  return (
    <motion.div
      layout={!prefersReduced}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group"
      onClick={onTap}
      role="button"
      tabIndex={0}
      aria-label={`${pet.name} ${TEMPLATE_LABELS[card.template]} card — ${expiryLabel}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
    >
      {/* Background image */}
      {isMultiPet && multiPetImages.length > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
          <div className="flex items-center -space-x-2.5">
            {multiPetImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                loading={index === 0 && i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-20 h-20 rounded-full object-cover border-2 border-surface-container"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        </div>
      ) : image ? (
        <img
          src={image}
          alt=""
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover${isInactive ? ' grayscale' : ''}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-on-primary/60"
          style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}
        >
          {pet.name?.[0]?.toUpperCase()}
        </div>
      )}

      {/* 4-stop gradient scrim */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to top,
            rgba(0,0,0,0.85) 0%,
            rgba(0,0,0,0.6) 25%,
            rgba(0,0,0,0.3) 55%,
            rgba(0,0,0,0.0) 100%
          )`,
        }}
      />

      {/* Template badge — top left */}
      <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold ${TEMPLATE_BADGE_COLORS[card.template] ?? TEMPLATE_BADGE_COLORS.custom}`}>
        {TEMPLATE_LABELS[card.template]}
      </div>

      {/* QR button — top right, active tiles only */}
      {!isInactive && (
        <button
          onClick={e => { e.stopPropagation(); onQr(); }}
          className="absolute top-3 right-3 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label="Show QR code"
        >
          <span className="material-symbols-outlined text-xl">qr_code_2</span>
        </button>
      )}

      {/* Revoked/Expired stamp */}
      {isInactive && (
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full glass-morphism bg-error/20 border border-error/30">
          <span className="text-xs font-bold uppercase tracking-wider text-error">
            {status === 'revoked' ? 'Revoked' : 'Expired'}
          </span>
        </div>
      )}

      {/* Stale indicator */}
      {isStale && !isInactive && (
        <div className="absolute top-3 right-14 px-2 py-1 rounded-lg bg-tertiary-container text-on-tertiary-container text-xs font-medium">
          <span className="material-symbols-outlined text-sm align-middle mr-0.5">sync</span>
          Stale
        </div>
      )}

      {/* Bottom overlay: pet name + expiry */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-xl font-bold text-white truncate">
          {isMultiPet ? `${(card.multiPetConfig ?? []).length} Pets` : pet.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isInactive
              ? 'bg-error/20 text-error-container'
              : isExpiringSoon
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-white/15 text-white/80'
          }`}>
            {expiryLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
