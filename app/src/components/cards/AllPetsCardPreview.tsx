import React from 'react';
import type { Pet } from '../../types/pet';
import type { PetCard } from '../../types/cardExtensions';
import { getCardStatus, formatExpiry } from '../../types/cardExtensions';
import { formatPetAge } from '../../lib/petAge';

interface AllPetsCardPreviewProps {
  pets: Pet[];
  card: PetCard;
}

export function AllPetsCardPreview({ pets, card }: AllPetsCardPreviewProps) {
  const status = getCardStatus(card);
  const visiblePets = pets.filter(p => !p.isPrivate);

  return (
    <div id={`card-preview-${card.id}`} className="bg-surface-container rounded-[2rem] shadow-xl border border-outline-variant overflow-hidden max-w-md mx-auto w-full print:shadow-none">
      {status !== 'active' && (
        <div className={`w-full text-center py-2 text-sm font-bold tracking-wide text-on-error ${status === 'revoked' ? 'bg-error' : 'bg-on-surface-variant'}`}>
          {status === 'revoked' ? '⛔ REVOKED' : '⏱ EXPIRED'}
        </div>
      )}

      <div className="h-20 bg-gradient-to-r from-primary to-primary-container relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-2 right-3 text-on-primary text-xs font-semibold uppercase tracking-wider drop-shadow-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">layers</span> All Pets
        </div>
        <div className="absolute bottom-3 left-5 text-on-primary font-bold text-lg">
          {visiblePets.length} Pet{visiblePets.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="p-6 space-y-3">
        {visiblePets.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm py-4">No public pets to display.</p>
        ) : (
          visiblePets.map(pet => (
            <div key={pet.id} className="flex items-center gap-3 bg-surface-container-low rounded-xl p-3 border border-outline-variant">
              {pet.image ? (
                <img src={pet.image} alt={pet.name} className={`w-12 h-12 object-cover border-2 border-surface-container shadow-sm ${pet.avatarShape === 'square' ? 'rounded-lg' : 'rounded-full'}`} referrerPolicy="no-referrer" />
              ) : (
                <div className={`w-12 h-12 border-2 border-surface-container shadow-sm flex items-center justify-center text-lg font-bold text-on-primary drop-shadow-sm ${pet.avatarShape === 'square' ? 'rounded-lg' : 'rounded-full'}`} style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}>
                  {pet.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface truncate">{pet.name}</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {pet.breed}{pet.age ? ` · ${formatPetAge(pet.birthday, pet.age)}` : ''}{pet.weight ? ` · ${pet.weight}` : ''}
                </p>
              </div>
            </div>
          ))
        )}

        {status === 'active' && (
          <p className="text-xs text-on-surface-variant text-center pt-2">Expires {formatExpiry(card.expiresAt)}</p>
        )}
      </div>
    </div>
  );
}
