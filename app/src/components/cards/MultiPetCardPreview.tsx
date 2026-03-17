import React from 'react';
import { Layers } from 'lucide-react';
import type { Pet } from '../../types/pet';
import type { PetCard } from '../../types/cardExtensions';
import { getCardStatus, formatExpiry, petAsSnapshot } from '../../types/cardExtensions';
import type { SharingToggles } from '../../types/cardExtensions';
import { CardSectionRenderer } from './CardSectionRenderer';

interface MultiPetCardPreviewProps {
  pets: Pet[];
  card: PetCard;
}

export function MultiPetCardPreview({ pets, card }: MultiPetCardPreviewProps) {
  const status = getCardStatus(card);
  const config = card.multiPetConfig ?? [];
  const includedPets = config
    .map(cfg => ({ cfg, pet: pets.find(p => p.id === cfg.petId) }))
    .filter((x): x is { cfg: typeof config[0]; pet: Pet } => !!x.pet);

  return (
    <div id={`card-preview-${card.id}`} className="bg-white rounded-[2rem] shadow-xl border border-stone-100 overflow-hidden max-w-md mx-auto w-full print:shadow-none">
      {status !== 'active' && (
        <div className={`w-full text-center py-2 text-sm font-bold tracking-wide text-white ${status === 'revoked' ? 'bg-rose-600' : 'bg-stone-400'}`}>
          {status === 'revoked' ? '⛔ REVOKED' : '⏱ EXPIRED'}
        </div>
      )}

      {/* Header — violet/indigo gradient */}
      <div className="h-20 bg-gradient-to-r from-violet-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-2 right-3 text-white text-xs font-semibold uppercase tracking-wider drop-shadow-sm flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Multi-pet Card
        </div>
        <div className="absolute bottom-3 left-5 text-white font-bold text-lg">
          {includedPets.length} Pet{includedPets.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Scrollable pet sections */}
      <div className="max-h-[60vh] overflow-y-auto">
        {includedPets.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-8">No pets selected.</p>
        ) : (
          includedPets.map(({ cfg, pet }) => {
            // Single coercion per pet: snapshot if available, else petAsSnapshot(pet)
            const data = cfg.petSnapshot ?? petAsSnapshot(pet);
            return (
              <div key={cfg.petId} className="border-b border-stone-100 last:border-b-0">
                {/* Per-pet avatar + name strip */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  {pet.image ? (
                    <img src={pet.image} alt={pet.name} className={`w-14 h-14 object-cover border-2 border-white shadow-md ${pet.avatarShape === 'square' ? 'rounded-xl' : 'rounded-full'}`} referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-14 h-14 border-2 border-white shadow-md flex items-center justify-center text-xl font-bold text-white drop-shadow-sm ${pet.avatarShape === 'square' ? 'rounded-xl' : 'rounded-full'}`} style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}>
                      {pet.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-stone-900 text-lg leading-tight">{pet.name}</p>
                  </div>
                </div>

                {/* Sections — compact mode (no accordions) */}
                <div className="px-5 pb-5">
                  <CardSectionRenderer
                    data={data}
                    sharing={cfg.sharing as SharingToggles}
                    fieldOrder={card.fieldOrder}
                    compact={true}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {status === 'active' && (
        <p className="text-xs text-stone-400 text-center py-3 border-t border-stone-100">Expires {formatExpiry(card.expiresAt)}</p>
      )}
    </div>
  );
}
