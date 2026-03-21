import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getPublicCard, type PublicCardDoc } from '../lib/firestoreService';
import { CardSectionRenderer } from '../components/cards/CardSectionRenderer';
import { SkeletonSharedCard } from '../components/cards/SkeletonSharedCard';
import type { SharingToggles } from '../types/cardExtensions';
import { TEMPLATE_COLORS, TEMPLATE_LABELS } from '../types/cardExtensions';

type CardState = PublicCardDoc | 'loading' | 'not-found' | 'revoked' | 'error';

const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

function makeTelLink(phone: string | undefined): string | null {
  if (!phone || !PHONE_REGEX.test(phone)) return null;
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function getMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function SharedCardPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardState>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const retry = () => setRetryKey(k => k + 1);

  // Canceled flag + clearTimeout pattern (replaces Promise.race)
  useEffect(() => {
    if (!cardId) { setCard('not-found'); return; }
    let canceled = false;

    const timeoutId = setTimeout(() => {
      if (!canceled) setCard('error');
    }, 5_000);

    getPublicCard(cardId)
      .then(data => {
        if (canceled) return;
        clearTimeout(timeoutId);
        if (!data) { setCard('not-found'); return; }
        if (data.status === 'revoked') { setCard('revoked'); return; }
        setCard(data);
      })
      .catch(() => {
        if (canceled) return;
        clearTimeout(timeoutId);
        setCard('error');
      });

    return () => { canceled = true; clearTimeout(timeoutId); };
  }, [cardId, retryKey]);

  // Loading state with skeleton
  if (card === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
        <div className="mb-6 flex items-center gap-2 text-on-surface-variant text-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>pets</span>
          <span>
            Shared via{' '}
            <span className="font-semibold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>PetID</span>
          </span>
        </div>
        <SkeletonSharedCard />
      </div>
    );
  }

  // Error state
  if (card === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '48px' }}>wifi_off</span>
        <h1 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
          Something went wrong
        </h1>
        <p className="text-on-surface-variant max-w-xs">Couldn't load this card.</p>
        <button onClick={retry} className="bg-primary text-on-primary px-6 py-2 rounded-full font-medium text-sm">
          Try Again
        </button>
      </div>
    );
  }

  // Not found
  if (card === 'not-found') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '48px' }}>help_outline</span>
        <h1 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>No Card Found</h1>
        <p className="text-on-surface-variant max-w-xs">No card exists at this URL.</p>
      </div>
    );
  }

  // Revoked
  if (card === 'revoked') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="material-symbols-outlined text-error" style={{ fontSize: '48px' }}>shield_off</span>
        <h1 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>Card Revoked</h1>
        <p className="text-on-surface-variant max-w-xs">This card has been revoked by its owner.</p>
      </div>
    );
  }

  // Missing petSnapshot guard
  if (!card.petSnapshot && !(card.multiPetConfig && card.multiPetConfig.length > 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '48px' }}>error_outline</span>
        <h1 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>Card Data Unavailable</h1>
        <p className="text-on-surface-variant max-w-xs">This card's data could not be loaded. The owner may need to update it.</p>
      </div>
    );
  }

  const isExpired = card.status !== 'active' || Date.now() > card.expiresAt;
  const isMulti = card.petId === 'multi-pet' || card.petId === 'all-pets' || (card.multiPetConfig && card.multiPetConfig.length > 0);
  const petName = isMulti ? `${card.multiPetConfig?.length || 0} Pets` : card.petSnapshot?.name;
  const petImage = !isMulti ? card.petSnapshot?.image : undefined;
  const petBreed = !isMulti ? card.petSnapshot?.breed : undefined;

  // Emergency contact phone
  const ec = card.petSnapshot?.emergencyContacts;
  const contactPhone = ec?.ownerPhone ?? ec?.additionalContacts?.[0]?.phone;
  const telHref = makeTelLink(contactPhone);
  const smsHref = telHref?.replace('tel:', 'sms:') ?? null;

  // Vet info
  const vetInfo = card.petSnapshot?.emergencyContacts?.vetInfo;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start print:bg-surface print:py-0 relative">

      {/* ── Header: PetID branding + Verified badge ─────────────────────── */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between px-5 pt-6 pb-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>pets</span>
          <span className="font-bold text-on-surface text-lg tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>PetID</span>
        </div>
        {!isExpired && (
          <div className="flex items-center gap-1.5 bg-secondary-container/60 text-on-secondary-container px-3 py-1 rounded-full text-xs font-semibold">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
            Verified Profile
          </div>
        )}
      </header>

      {/* ── Hero: Full-bleed cinematic pet photo ────────────────────────── */}
      <section className="w-full max-w-lg mx-auto px-4 mt-2">
        <div className="relative rounded-[2rem] overflow-hidden">
          {petImage ? (
            <img
              src={petImage}
              alt={petName}
              className="w-full h-72 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-primary/30 to-tertiary/30" />
          )}

          {/* Dark scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Glass overlay badge: ACTIVE / EXPIRED */}
          <div className="absolute top-4 right-4">
            {isExpired ? (
              <span className="glass inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-error border border-error/30">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                EXPIRED
              </span>
            ) : (
              <span className="glass inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-secondary border border-secondary/30">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                ACTIVE
              </span>
            )}
          </div>

          {/* Template label badge */}
          <div className="absolute top-4 left-4">
            <span className="glass inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-on-surface/80">
              {isMulti && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>layers</span>}
              {isMulti ? 'Multi-pet Card' : (TEMPLATE_LABELS[card.template] ?? 'Pet Card')}
            </span>
          </div>

          {/* Pet name + breed overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1
              className="text-5xl font-extrabold text-white text-glow leading-tight"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {petName}
            </h1>
            {petBreed && (
              <p className="text-white/70 text-sm mt-1 font-medium">{petBreed}</p>
            )}
            {card.petSnapshot?.age && (
              <p className="text-white/50 text-xs mt-0.5">{card.petSnapshot.age}</p>
            )}
          </div>

          {/* "Managed by" badge — bottom right */}
          {card.ownerDisplayName && (
            <div className="absolute bottom-4 right-4">
              <span className="glass inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-on-surface/80">
                Managed by {card.ownerDisplayName}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Expired banner ──────────────────────────────────────────────── */}
      {isExpired && (
        <div className="w-full max-w-lg mx-auto mt-3 px-4">
          <div className="flex items-center gap-2 bg-error-container text-on-error-container rounded-2xl px-4 py-2.5 text-sm font-bold tracking-wide">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
            EXPIRED {card.expiresAt ? `— ${new Date(card.expiresAt).toLocaleDateString()}` : ''}
          </div>
        </div>
      )}

      {/* ── Emergency Contact CTA (recipient mode) ────────────────────── */}
      {!isExpired && (card.sharing as unknown as SharingToggles).emergencyContact && telHref && (
        <section className="w-full max-w-lg mx-auto px-4 mt-4">
          <div className="glass-card p-4">
            <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[16px] text-secondary">phone</span>
              Emergency Contact
            </h3>
            {ec?.ownerPhone && (
              <p className="text-sm text-on-surface mb-1">
                {ec.additionalContacts?.[0]?.name ? ec.additionalContacts[0].name : 'Owner'}: {contactPhone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <a
                href={telHref}
                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 min-h-[44px] rounded-xl font-medium text-sm"
              >
                <span className="material-symbols-outlined text-lg">call</span>
                Call Now
              </a>
              {smsHref && (
                <a
                  href={smsHref}
                  className="flex items-center gap-2 bg-surface-container-high text-on-surface px-4 py-2.5 min-h-[44px] rounded-xl font-medium text-sm"
                >
                  <span className="material-symbols-outlined text-lg">sms</span>
                  Message
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Bento Grid Info Cards (recipient mode) ────────────────────── */}
      <section className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="glass-card p-4 space-y-4">

          {/* Multi-pet layout */}
          {isMulti && card.multiPetConfig ? (
            <div className="divide-y divide-outline-variant">
              {card.multiPetConfig.map(cfg => (
                <div key={cfg.petId} className="flex flex-col">
                  <div className="flex items-center gap-3 px-1 pt-4 pb-3">
                    {cfg.petSnapshot.image && (
                      <div className="story-ring">
                        <img
                          src={cfg.petSnapshot.image}
                          alt={cfg.petSnapshot.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-surface"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div>
                      <h3
                        className="font-bold text-on-surface text-lg leading-tight"
                        style={{ fontFamily: 'var(--font-headline)' }}
                      >
                        {cfg.petSnapshot.name}
                      </h3>
                      <p className="text-sm text-on-surface-variant">{cfg.petSnapshot.breed}</p>
                    </div>
                  </div>
                  <CardSectionRenderer
                    data={cfg.petSnapshot}
                    sharing={cfg.sharing as unknown as SharingToggles}
                    fieldOrder={card.fieldOrder}
                    includeGeneralInfo={false}
                    mode="recipient"
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
                mode="recipient"
              />
            )
          )}

          {/* Vet info with directions */}
          {(card.sharing as unknown as SharingToggles).vetInfo && vetInfo && (
            <div className="px-4 py-4 border-t border-outline-variant">
              <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-primary">monitor_heart</span>
                Primary Vet
              </h3>
              <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant">
                {vetInfo.name && <p className="font-medium text-on-surface text-sm">{vetInfo.name}</p>}
                {vetInfo.clinic && <p className="text-xs text-on-surface-variant">{vetInfo.clinic}</p>}
                {vetInfo.phone && (
                  <p className="text-xs text-on-surface-variant">{vetInfo.phone}</p>
                )}
                {vetInfo.address && (
                  <a
                    href={getMapsUrl(vetInfo.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">directions</span>
                    View Directions
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer: Expiry notice ─────────────────────────────────────── */}
      <footer className="w-full max-w-lg mx-auto px-4 mt-4 mb-24 print:mb-4">
        <div className="glass-card px-5 py-4 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: '14px' }}>schedule</span>
          {isExpired
            ? (
              <span className="text-error font-medium flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shield_off</span>
                This card is no longer valid.
              </span>
            )
            : <span>Secure share link expires {new Date(card.expiresAt).toLocaleDateString()}</span>
          }
        </div>
        {/* Branded footer */}
        <div className="mt-4 text-center print:hidden">
          <a href="/" className="text-on-surface-variant text-xs hover:text-on-surface transition-colors">
            Made with{' '}
            <span className="font-semibold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
              PetBase
            </span>
            {' — '}Create a card for your pet →
          </a>
        </div>
      </footer>

      {/* ── Mobile FAB: CONTACT OWNER ───────────────────────────────────── */}
      {!isExpired && telHref && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 print:hidden">
          <a
            href={telHref}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full shadow-lg font-bold text-sm tracking-wide hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>call</span>
            CONTACT OWNER
          </a>
        </div>
      )}
    </div>
  );
}
