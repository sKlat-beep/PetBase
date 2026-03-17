import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getPublicCard, type PublicCardDoc } from '../lib/firestoreService';
import { PawPrint, Clock, ShieldOff, Layers, Users } from 'lucide-react';
import { CardSectionRenderer } from '../components/cards/CardSectionRenderer';
import type { SharingToggles } from '../types/cardExtensions';
import { TEMPLATE_COLORS, TEMPLATE_LABELS } from '../types/cardExtensions';

export function SharedCardPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<PublicCardDoc | null | 'loading' | 'not-found'>('loading');

  useEffect(() => {
    if (!cardId) { setCard('not-found'); return; }
    getPublicCard(cardId)
      .then(data => setCard(data ?? 'not-found'))
      .catch(() => setCard('not-found'));
  }, [cardId]);

  if (card === 'loading') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (card === 'not-found' || card === null || card.status === 'revoked') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldOff className="w-12 h-12 text-stone-400" />
        <h1 className="text-xl font-bold text-stone-700">Card Not Found</h1>
        <p className="text-stone-500 max-w-xs">This card is no longer valid.</p>
      </div>
    );
  }

  const isExpired = card.status !== 'active' || Date.now() > card.expiresAt;
  const isRevoked = false; // revoked cards are caught by the early-return guard above
  const headerColor = TEMPLATE_COLORS[card.template] ?? 'bg-emerald-500';

  const isMulti = card.petId === 'multi-pet' || card.petId === 'all-pets' || (card.multiPetConfig && card.multiPetConfig.length > 0);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-start py-10 px-4">
      {/* PetBase branding */}
      <div className="mb-6 flex items-center gap-2 text-stone-500 text-sm">
        <PawPrint className="w-4 h-4 text-emerald-500" />
        <span>Shared via <span className="font-semibold text-stone-700">PetBase</span></span>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-stone-100 overflow-hidden w-full max-w-sm">
        {/* Status banner */}
        {(isRevoked || isExpired) && (
          <div className={`w-full text-center py-2 text-sm font-bold tracking-wide text-white ${isRevoked ? 'bg-rose-600' : 'bg-stone-400'}`}>
            {isRevoked ? '⛔ REVOKED' : '⏱ EXPIRED'}
          </div>
        )}

        {/* Header */}
        <div className={`h-28 ${headerColor} relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]" />
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-medium uppercase tracking-widest flex items-center gap-1 drop-shadow-sm">
                {isMulti && <Layers className="w-3 h-3" />}
                {isMulti ? 'Multi-pet Card' : (TEMPLATE_LABELS[card.template] ?? 'Pet Card')}
              </p>
              <h2 className="text-white font-extrabold text-2xl leading-tight">
                {isMulti ? `${card.multiPetConfig?.length || 0} Pets` : card.petSnapshot?.name}
              </h2>
              {!isMulti && (card.petSnapshot as any)?.followers?.length > 0 && (
                <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" /> {(card.petSnapshot as any).followers.length} followers
                </p>
              )}
            </div>
            {!isMulti && card.petSnapshot?.image && (
              <img
                src={card.petSnapshot.image}
                alt={card.petSnapshot.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>

        {/* Body */}
        {isMulti && card.multiPetConfig ? (
          <div className="divide-y divide-stone-100">
            {card.multiPetConfig.map(cfg => (
              <div key={cfg.petId} className="flex flex-col">
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  {cfg.petSnapshot.image && (
                    <img
                      src={cfg.petSnapshot.image}
                      alt={cfg.petSnapshot.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg leading-tight">{cfg.petSnapshot.name}</h3>
                    <p className="text-sm text-stone-500">{cfg.petSnapshot.breed}</p>
                  </div>
                </div>
                <CardSectionRenderer
                  data={cfg.petSnapshot}
                  sharing={cfg.sharing as unknown as SharingToggles}
                  fieldOrder={card.fieldOrder}
                  includeGeneralInfo={false}
                />
              </div>
            ))}
          </div>
        ) : (
          card.petSnapshot && (
            <CardSectionRenderer
              data={card.petSnapshot}
              sharing={card.sharing as unknown as SharingToggles}
              fieldOrder={card.fieldOrder}
              includeGeneralInfo={card.includeGeneralInfo}
            />
          )
        )}

        {/* Expiry */}
        <div className="px-5 py-4 bg-stone-50 flex items-center gap-2 text-xs text-stone-400 border-t border-stone-100">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {isExpired || isRevoked
            ? <span className="text-rose-500 font-medium flex items-center gap-1"><ShieldOff className="w-3.5 h-3.5" /> This card is no longer valid.</span>
            : <span>Expires {new Date(card.expiresAt).toLocaleDateString()}</span>
          }
        </div>
      </div>

      <p className="mt-6 text-xs text-stone-400 text-center">
        Powered by PetBase · This card was shared by its owner.
      </p>
    </div>
  );
}
