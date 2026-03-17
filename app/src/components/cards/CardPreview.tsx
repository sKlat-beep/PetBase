import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import type { Pet } from '../../types/pet';
import type { PetCard } from '../../types/cardExtensions';
import { getCardStatus, TEMPLATE_COLORS, TEMPLATE_LABELS, formatExpiry, petAsSnapshot } from '../../types/cardExtensions';
import { CardSectionRenderer } from './CardSectionRenderer';
import type { SharingToggles } from '../../types/cardExtensions';

interface CardPreviewProps {
  pet: Pet;
  card: PetCard;
}

export function CardPreview({ pet, card }: CardPreviewProps) {
  const status = getCardStatus(card);
  const headerColor = TEMPLATE_COLORS[card.template];
  // Single sanctioned coercion — use snapshot if available, fall back to petAsSnapshot
  const data = card.petSnapshot ?? petAsSnapshot(pet);

  return (
    <motion.div
      id={`card-preview-${card.id}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="motion-safe:animate-none bg-white rounded-[2rem] shadow-xl border border-stone-100 overflow-hidden relative max-w-md mx-auto w-full print:shadow-none print:border-0"
    >
      {/* Status banner for expired/revoked */}
      {status !== 'active' && (
        <div className={`w-full text-center py-2 text-sm font-bold tracking-wide text-white ${status === 'revoked' ? 'bg-rose-600' : 'bg-stone-400'}`}>
          {status === 'revoked' ? '⛔ REVOKED' : '⏱ EXPIRED'}
        </div>
      )}

      {/* Header bar */}
      <div className={`h-28 ${headerColor} relative overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
        />
        <div className="absolute top-2 right-3 text-white text-xs font-semibold uppercase tracking-wider drop-shadow-sm">
          {TEMPLATE_LABELS[card.template]}
        </div>
      </div>

      {/* Avatar — overlaps header/body boundary */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <div
          className={`w-28 h-28 border-4 border-white overflow-hidden shadow-lg bg-stone-500 ${
            data.avatarShape === 'square' ? 'rounded-xl' : data.avatarShape === 'squircle' ? 'rounded-[2rem]' : 'rounded-full'
          }`}
          style={!data.image && data.backgroundColor ? { backgroundColor: data.backgroundColor } : undefined}
        >
          {data.image ? (
            <img src={data.image} alt={data.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white drop-shadow-sm">
              {data.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="pb-8 px-8 text-center" style={{ paddingTop: '5.5rem' }}>
        {/* Pet name — navigable to /pets */}
        <Link to="/pets" className="text-3xl font-bold text-stone-900 hover:text-emerald-600 transition-colors no-underline">
          {data.name}
        </Link>

        {/* Sections via shared renderer */}
        <div className="mt-6 text-left">
          <CardSectionRenderer
            data={data}
            sharing={card.sharing}
            fieldOrder={card.fieldOrder}
            includeGeneralInfo={card.includeGeneralInfo}
          />
        </div>

        {/* Expiry note */}
        {status === 'active' && (
          <p className="mt-6 text-xs text-stone-400 text-center">Expires {formatExpiry(card.expiresAt)}</p>
        )}
      </div>
    </motion.div>
  );
}
