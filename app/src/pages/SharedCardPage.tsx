import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getPublicCard, type PublicCardDoc } from '../lib/firestoreService';
import { PawPrint, Clock, ShieldOff, HelpCircle, Layers } from 'lucide-react';
import { CardSectionRenderer } from '../components/cards/CardSectionRenderer';
import { SkeletonSharedCard } from '../components/cards/SkeletonSharedCard';
import type { SharingToggles } from '../types/cardExtensions';
import { TEMPLATE_COLORS, TEMPLATE_LABELS } from '../types/cardExtensions';

type CardState = PublicCardDoc | 'loading' | 'not-found' | 'revoked';

export function SharedCardPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardState>('loading');

  useEffect(() => {
    if (!cardId) { setCard('not-found'); return; }
    getPublicCard(cardId)
      .then(data => {
        if (!data) { setCard('not-found'); return; }
        if (data.status === 'revoked') { setCard('revoked'); return; }
        if (data.status !== 'active' || Date.now() > data.expiresAt) {
          // Store doc for expired state so we can show the expiry date
          setCard(data);
          return;
        }
        setCard(data);
      })
      .catch(() => setCard('not-found'));
  }, [cardId]);

  // Loading state with skeleton
  if (card === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-start py-10 px-4">
        <div className="mb-6 flex items-center gap-2 text-neutral-500 text-sm">
          <PawPrint className="w-4 h-4 text-emerald-500" />
          <span>Shared via <span className="font-semibold text-neutral-700 dark:text-neutral-300">PetBase</span></span>
        </div>
        <SkeletonSharedCard />
      </div>
    );
  }

  // Not found
  if (card === 'not-found') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <HelpCircle className="w-12 h-12 text-neutral-400" />
        <h1 className="text-xl font-bold text-neutral-700 dark:text-neutral-200">No Card Found</h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-xs">No card exists at this URL.</p>
      </div>
    );
  }

  // Revoked
  if (card === 'revoked') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldOff className="w-12 h-12 text-rose-400" />
        <h1 className="text-xl font-bold text-neutral-700 dark:text-neutral-200">Card Revoked</h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-xs">This card has been revoked by its owner.</p>
      </div>
    );
  }

  const isExpired = card.status !== 'active' || Date.now() > card.expiresAt;
  const headerColor = TEMPLATE_COLORS[card.template] ?? 'bg-emerald-500';
  const isMulti = card.petId === 'multi-pet' || card.petId === 'all-pets' || (card.multiPetConfig && card.multiPetConfig.length > 0);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-start py-10 px-4 print:bg-white print:py-0">
      {/* PetBase branding */}
      <div className="mb-6 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm print:hidden">
        <PawPrint className="w-4 h-4 text-emerald-500" />
        <span>Shared via <span className="font-semibold text-neutral-700 dark:text-neutral-300">PetBase</span></span>
      </div>

      <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-white/20 dark:border-neutral-700/40 overflow-hidden w-full max-w-sm print:shadow-none print:border-neutral-200 print:bg-white print:backdrop-blur-none">
        {/* Status banner */}
        {isExpired && (
          <div className="w-full text-center py-2 text-sm font-bold tracking-wide text-white bg-neutral-400 dark:bg-neutral-600">
            <Clock className="w-4 h-4 inline -mt-0.5 mr-1" />
            EXPIRED {card.expiresAt ? `— ${new Date(card.expiresAt).toLocaleDateString()}` : ''}
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
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {card.multiPetConfig.map(cfg => (
              <div key={cfg.petId} className="flex flex-col">
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  {cfg.petSnapshot.image && (
                    <img
                      src={cfg.petSnapshot.image}
                      alt={cfg.petSnapshot.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-neutral-700 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg leading-tight">{cfg.petSnapshot.name}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{cfg.petSnapshot.breed}</p>
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
        <div className="px-5 py-4 bg-neutral-50/80 dark:bg-neutral-800/60 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-700">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {isExpired
            ? <span className="text-rose-500 font-medium flex items-center gap-1"><ShieldOff className="w-3.5 h-3.5" /> This card is no longer valid.</span>
            : <span>Expires {new Date(card.expiresAt).toLocaleDateString()}</span>
          }
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500 text-center print:hidden">
        Powered by PetBase · This card was shared by its owner.
      </p>
    </div>
  );
}
