// app/src/pages/Cards.tsx
// Orchestration shell — ~150 lines. All types, constants, helpers, and sub-components
// live in cardExtensions.ts and app/src/components/cards/*.

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import type { Pet } from '../types/pet';
import {
  type PetCard, type CardTemplate, type CardStatus, type SharingToggles,
  GENERAL_INFO_KEY, UNDO_WINDOW_MS, MAX_INACTIVE_CARDS,
  getCardStatus, buildPetSnapshot, isPetDataStale, timeUntilExpiry, formatExpiry
} from '../types/cardExtensions';
import {
  savePublicCard, updatePublicCardStatus, deletePublicCard,
  getPublicCardsForOwner, updatePublicCardStatusWithTimestamp,
  type PublicCardPetSnapshot, type PublicCardDoc
} from '../lib/firestoreService';
import { logActivity } from '../utils/activityLog';
import { markCardCreated } from '../lib/onboardingService';
import { useHouseholdPermissions } from '../hooks/useHouseholdPermissions';
import { Confetti, useCelebration } from '../components/ui/Confetti';
import { CardPreview } from '../components/cards/CardPreview';
import { MultiPetCardPreview } from '../components/cards/MultiPetCardPreview';
import { AllPetsCardPreview } from '../components/cards/AllPetsCardPreview';
import { CardTile } from '../components/cards/CardTile';
import { CardGalleryTile } from '../components/cards/CardGalleryTile';
import { CardActionDrawer } from '../components/cards/CardActionDrawer';
import { CardLogEntry } from '../components/cards/CardLogEntry';
import { QrOverlay } from '../components/cards/QrOverlay';

const CreateCardModal = React.lazy(() => import('../components/cards/CreateCardModal'));
const MultiPetCardModal = React.lazy(() => import('../components/cards/MultiPetCardModal'));

// Purge expired/revoked cards older than 30 days to minimise attack surface
const CARD_PURGE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function Cards() {
  const { pets, loading } = usePets();
  const { user, profile } = useAuth();
  const { canCreateRevokePetCards } = useHouseholdPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [cards, setCards] = useState<PetCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMultiPetModal, setShowMultiPetModal] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<PetCard | null>(null);
  const [revokedSectionOpen, setRevokedSectionOpen] = useState(false);
  const [drawerCardId, setDrawerCardId] = useState<string | null>(null);
  const [qrCardId, setQrCardId] = useState<string | null>(null);
  const [generalInfo, setGeneralInfo] = useState(() => localStorage.getItem(GENERAL_INFO_KEY) ?? '');
  const [editingGeneralInfo, setEditingGeneralInfo] = useState(false);
  const { confettiActive, celebrate } = useCelebration();

  // Seed card list from Firestore — single source of truth
  useEffect(() => {
    if (!user) { setCards([]); setCardsLoading(false); return; }
    let cancelled = false;
    getPublicCardsForOwner(user.uid)
      .then(docs => {
        if (cancelled) return;
        const now = Date.now();
        // Filter out permanently purged cards (revoked/expired > 30 days)
        const kept: PetCard[] = docs
          .filter(d => {
            if (d.status === 'active') return true;
            const ageMs = d.status === 'revoked' && d.revokedAt ? now - d.revokedAt : now - d.expiresAt;
            return ageMs < CARD_PURGE_AGE_MS;
          })
          .map(d => ({
            id: d.id,
            petId: d.petId,
            template: d.template as CardTemplate,
            createdAt: d.createdAt,
            expiresAt: d.expiresAt,
            status: d.status as CardStatus,
            sharing: d.sharing as unknown as SharingToggles,
            includeGeneralInfo: d.includeGeneralInfo,
            fieldOrder: d.fieldOrder,
            petSnapshot: d.petSnapshot as any, // Firestore boundary: PublicCardPetSnapshot typed as any in PublicCardDoc
            multiPetConfig: d.multiPetConfig as any, // Firestore boundary: per-pet sharing typed as Record<string,boolean> in PublicCardDoc
            revokedAt: d.revokedAt,
          }));
        setCards(kept);
        setCardsLoading(false);

        // Clean up old revoked docs past undo window
        docs.filter(d => d.status === 'revoked' && d.revokedAt && now >= d.revokedAt + UNDO_WINDOW_MS)
          .forEach(d => deletePublicCard(d.id).catch(() => { }));
      })
      .catch(() => { if (!cancelled) setCardsLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  // Handle router state from Dashboard Quick Actions → "Create Card"
  useEffect(() => {
    if (location.state?.openCreateModal) {
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);
  const selectedPet = useMemo(() => selectedCard ? pets.find(p => p.id === selectedCard.petId) : undefined, [selectedCard, pets]);

  // Legacy fix: rebuild snapshots for active cards missing petSnapshot
  useEffect(() => {
    if (!user || cardsLoading || pets.length === 0) return;
    const staleCards = cards.filter(
      c => getCardStatus(c) === 'active' && c.petId !== 'multi-pet' && c.petId !== 'all-pets' && !c.petSnapshot
    );
    if (staleCards.length === 0) return;
    staleCards.forEach(card => {
      const pet = pets.find(p => p.id === card.petId);
      if (!pet) return;
      const snapshot = buildPetSnapshot(pet, card.sharing, card.includeGeneralInfo ?? false, generalInfo, user.uid);
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, petSnapshot: snapshot } : c));
      savePublicCard({
        id: card.id, ownerId: user.uid, petId: card.petId, template: card.template,
        sharing: card.sharing as unknown as Record<string, boolean>,
        expiresAt: card.expiresAt, status: 'active', createdAt: card.createdAt,
        includeGeneralInfo: card.includeGeneralInfo, petSnapshot: snapshot,
        fieldOrder: card.fieldOrder, ownerDisplayName: user.displayName ?? undefined,
      } as any).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsLoading, pets.length]);

  // Auto-select first active card if none selected
  useEffect(() => {
    if (selectedCardId) return;
    const firstActive = cards.find(c => getCardStatus(c) === 'active');
    if (firstActive) setSelectedCardId(firstActive.id);
  }, [cards, selectedCardId]);

  /** Derived lists — used for header count badge and rendering. */
  const activeCards = useMemo(() => cards.filter(c => getCardStatus(c) === 'active'), [cards]);
  const inactiveCards = useMemo(() => cards.filter(c => getCardStatus(c) !== 'active').slice(0, MAX_INACTIVE_CARDS), [cards]);

  /** Set of card IDs whose pet data has changed since the snapshot was taken. */
  const staleCardIds = useMemo(() => {
    const ids = new Set<string>();
    cards.filter(c => getCardStatus(c) === 'active').forEach(c => {
      if (c.petId === 'multi-pet' && c.multiPetConfig) {
        // Check each pet in multi-pet config
        for (const cfg of c.multiPetConfig) {
          const pet = pets.find(p => p.id === cfg.petId);
          if (pet && isPetDataStale({ ...c, petSnapshot: cfg.petSnapshot } as PetCard, pet)) {
            ids.add(c.id);
            break;
          }
        }
      } else if (c.petId === 'all-pets') {
        // Check all non-private pets
        for (const pet of pets.filter(p => !p.isPrivate)) {
          const cfg = c.multiPetConfig?.find(mc => mc.petId === pet.id);
          if (cfg && isPetDataStale({ ...c, petSnapshot: cfg.petSnapshot } as PetCard, pet)) {
            ids.add(c.id);
            break;
          }
        }
      } else {
        const pet = pets.find(p => p.id === c.petId);
        if (pet && isPetDataStale(c, pet)) ids.add(c.id);
      }
    });
    return ids;
  }, [cards, pets]);

  /** Resolve a Pet object for a given card (handles multi-pet / all-pets placeholders). */
  const getPetForCard = useCallback((card: PetCard): Pet => {
    if (card.petId === 'all-pets')
      return { id: 'all-pets', name: 'All Pets', breed: `${pets.filter(p => !p.isPrivate).length} pets`, image: '', age: '', weight: '', notes: '' } as Pet;
    if (card.petId === 'multi-pet')
      return { id: 'multi-pet', name: 'Multi-pet Card', breed: `${card.multiPetConfig?.length ?? 0} pets selected`, image: '', age: '', weight: '', notes: '' } as Pet;
    return pets.find(p => p.id === card.petId) ?? { id: card.petId, name: 'Unknown', breed: '', image: '', age: '', weight: '', notes: '' } as Pet;
  }, [pets]);

  const handleDownloadCard = useCallback(async (cardId: string) => {
    const el = document.getElementById(`card-preview-${cardId}`) ?? document.querySelector('[data-card-preview]');
    if (!el) return;
    const card = cards.find(c => c.id === cardId);
    const petName = card ? getPetForCard(card).name : 'card';
    try {
      const { downloadElementAsImage } = await import('../utils/exportImage');
      await downloadElementAsImage(el as HTMLElement, `${petName}-card.png`);
    } catch { /* silent */ }
  }, [cards, getPetForCard]);

  const handleCopied = useCallback(() => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
    if (localStorage.getItem('petbase-step-share-card') !== 'true') {
      localStorage.setItem('petbase-step-share-card', 'true');
      window.dispatchEvent(new Event('petbase-guide-update'));
    }
  }, []);

  const handleCreate = (card: PetCard) => {
    // Enforce one active custom card: revoke any existing active custom/emergency cards
    if (card.template === 'custom' || card.template === 'emergency') {
      const existingCustom = cards.filter(c =>
        (c.template === 'custom' || c.template === 'emergency') &&
        getCardStatus(c) === 'active' &&
        c.id !== card.id
      );
      if (existingCustom.length > 0) {
        existingCustom.forEach(c => {
          updatePublicCardStatus(c.id, 'revoked').catch(() => { });
          setTimeout(() => deletePublicCard(c.id).catch(() => { }), UNDO_WINDOW_MS);
        });
        setCards(prev => prev.map(c =>
          (c.template === 'custom' || c.template === 'emergency') && getCardStatus(c) === 'active' && c.id !== card.id
            ? { ...c, status: 'revoked' as CardStatus, revokedAt: Date.now() }
            : c
        ));
      }
    }

    // Build petSnapshot for consistent preview/shared card rendering
    let localCard = card;
    if (card.petId !== 'multi-pet' && card.petId !== 'all-pets') {
      const pet = pets.find(p => p.id === card.petId);
      if (pet) {
        const snapshot = buildPetSnapshot(pet, card.sharing, card.includeGeneralInfo ?? false, generalInfo, user?.uid);
        localCard = { ...card, petSnapshot: snapshot };
      }
    } else {
      const configList = card.petId === 'multi-pet'
        ? card.multiPetConfig ?? []
        : pets.filter(p => !p.isPrivate).map(p => ({ petId: p.id, sharing: card.sharing }));
      localCard = {
        ...card,
        multiPetConfig: configList.map(cfg => {
          const p = pets.find(x => x.id === cfg.petId);
          if (!p) return cfg;
          return { ...cfg, petSnapshot: buildPetSnapshot(p, cfg.sharing, false, '', user?.uid) };
        }),
      };
    }

    setCards(prev => {
      if (prev.some(c => c.id === localCard.id)) {
        return prev.map(c => c.id === localCard.id ? localCard : c);
      }
      return [...prev, localCard];
    });
    setSelectedCardId(localCard.id);

    // Sync to Firestore so the share link works for recipients without auth
    if (user) {
      if (localCard.petId === 'multi-pet' || localCard.petId === 'all-pets') {
        const petConfigList = localCard.petId === 'multi-pet'
          ? localCard.multiPetConfig
          : pets.filter(p => !p.isPrivate).map(p => ({ petId: p.id, sharing: localCard.sharing }));

        logActivity(user.uid, `Created pet card for: ${localCard.petId}`);
        // Firestore boundary: PublicCardDoc.sharing is Record<string,boolean>
        savePublicCard({
          id: localCard.id,
          ownerId: user.uid,
          petId: localCard.petId,
          template: localCard.template,
          sharing: localCard.sharing as unknown as Record<string, boolean>,
          expiresAt: localCard.expiresAt,
          status: 'active',
          createdAt: localCard.createdAt,
          includeGeneralInfo: localCard.includeGeneralInfo,
          fieldOrder: localCard.fieldOrder,
          ownerDisplayName: user.displayName ?? undefined,
          multiPetConfig: petConfigList?.map(cfg => {
            const p = pets.find(x => x.id === cfg.petId);
            return {
              petId: cfg.petId,
              sharing: cfg.sharing as unknown as Record<string, boolean>,
              petSnapshot: p
                ? buildPetSnapshot(p, cfg.sharing, localCard.includeGeneralInfo ?? false, generalInfo, user?.uid)
                : undefined,
            };
          })
        } as any).catch(err => console.warn('Failed to sync card to Firestore:', err));
      } else {
        const pet = pets.find(p => p.id === localCard.petId);
        const petName = pet?.name ?? localCard.petId;
        logActivity(user.uid, `Created pet card for: ${petName}`);
        if (pet) {
          // Firestore boundary: PublicCardDoc.sharing is Record<string,boolean>
          savePublicCard({
            id: localCard.id,
            ownerId: user.uid,
            petId: localCard.petId,
            template: localCard.template,
            sharing: localCard.sharing as unknown as Record<string, boolean>,
            expiresAt: localCard.expiresAt,
            status: 'active',
            createdAt: localCard.createdAt,
            includeGeneralInfo: localCard.includeGeneralInfo,
            petSnapshot: localCard.petSnapshot,
            fieldOrder: localCard.fieldOrder,
            ownerDisplayName: user.displayName ?? undefined,
          } as any).catch(err => console.warn('Failed to sync card to Firestore:', err));
        }
      }
    }
    celebrate('first-card-created');
  };

  const handleRevoke = (cardId: string) => {
    const revokedAt = Date.now();
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: 'revoked' as CardStatus, revokedAt } : c));
    updatePublicCardStatusWithTimestamp(cardId, 'revoked', revokedAt).catch(() => { });
    // Schedule permanent deletion after undo window
    setTimeout(() => deletePublicCard(cardId).catch(() => { }), UNDO_WINDOW_MS);
    if (user) {
      const card = cards.find(c => c.id === cardId);
      const petName = card ? (pets.find(p => p.id === card.petId)?.name ?? card.petId) : cardId;
      logActivity(user.uid, `Revoked pet card for: ${petName}`);
    }
  };

  const handleUndoRevoke = (cardId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: 'active' as CardStatus, revokedAt: undefined } : c));
    updatePublicCardStatusWithTimestamp(cardId, 'active').catch(() => { });
  };

  /** Rebuild the petSnapshot for a card using current pet data, then re-sync to Firestore. */
  const handleUpdateCard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !user) return;

    if (card.petId === 'multi-pet' || card.petId === 'all-pets') {
      // Rebuild snapshots for each pet in the config
      const configList = card.petId === 'all-pets'
        ? pets.filter(p => !p.isPrivate).map(p => ({ petId: p.id, sharing: card.sharing }))
        : card.multiPetConfig ?? [];
      const updatedConfig = configList.map(cfg => {
        const p = pets.find(x => x.id === cfg.petId);
        if (!p) return cfg;
        return { ...cfg, petSnapshot: buildPetSnapshot(p, cfg.sharing, false, '', user.uid) };
      });
      const updated: PetCard = { ...card, multiPetConfig: updatedConfig };
      setCards(prev => prev.map(c => c.id === cardId ? updated : c));
      savePublicCard({
        id: updated.id, ownerId: user.uid, petId: updated.petId, template: updated.template,
        sharing: updated.sharing as unknown as Record<string, boolean>,
        expiresAt: updated.expiresAt, status: 'active', createdAt: updated.createdAt,
        includeGeneralInfo: updated.includeGeneralInfo, fieldOrder: updated.fieldOrder,
        ownerDisplayName: user.displayName ?? undefined,
        multiPetConfig: updatedConfig.map(cfg => ({
          petId: cfg.petId,
          sharing: cfg.sharing as unknown as Record<string, boolean>,
          petSnapshot: (cfg as any).petSnapshot,
        })),
      } as any).catch(err => console.warn('Failed to update card snapshot:', err));
      return;
    }

    const pet = pets.find(p => p.id === card.petId);
    if (!pet) return;
    const snapshot = buildPetSnapshot(pet, card.sharing, card.includeGeneralInfo ?? false, generalInfo, user.uid);
    const updated: PetCard = { ...card, petSnapshot: snapshot };
    setCards(prev => prev.map(c => c.id === cardId ? updated : c));
    savePublicCard({
      id: updated.id, ownerId: user.uid, petId: updated.petId, template: updated.template,
      sharing: updated.sharing as unknown as Record<string, boolean>,
      expiresAt: updated.expiresAt, status: updated.status as 'active',
      createdAt: updated.createdAt, includeGeneralInfo: updated.includeGeneralInfo,
      petSnapshot: snapshot, fieldOrder: updated.fieldOrder,
      ownerDisplayName: user.displayName ?? undefined,
    } as any).catch(err => console.warn('Failed to update card snapshot:', err));
  }, [cards, pets, user, generalInfo]);

  /** Rebuild snapshots for all stale active single-pet cards. */
  const handleUpdateAllCards = useCallback(() => {
    cards
      .filter(c => getCardStatus(c) === 'active' && c.petId !== 'multi-pet' && c.petId !== 'all-pets')
      .forEach(c => {
        const pet = pets.find(p => p.id === c.petId);
        if (pet && isPetDataStale(c, pet)) handleUpdateCard(c.id);
      });
  }, [cards, pets, handleUpdateCard]);

  if (loading || cardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>Pet Cards</h1>
          <p className="text-on-surface-variant mt-1">Shareable profiles for sitters, walkers, and emergencies.</p>
        </header>
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mx-auto mb-4 block">pets</span>
          <h2 className="text-xl font-semibold text-on-surface mb-2" style={{ fontFamily: 'var(--font-headline)' }}>No pets yet</h2>
          <p className="text-on-surface-variant mb-6">Add your first pet before creating a card.</p>
          <Link to="/pets" className="inline-block bg-primary-container hover:opacity-90 text-on-primary-container px-5 py-2.5 rounded-xl font-medium transition-colors">
            Go to My Pets →
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <Confetti active={confettiActive} />
      {/* Copy toast — aria-live announces to screen readers when it appears */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {copyToast ? 'Link copied to clipboard' : ''}
      </div>
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            aria-hidden="true"
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface text-sm font-medium px-4 py-2 rounded-xl shadow-lg pointer-events-none"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
            Active Identity Cards{activeCards.length > 0 && <span className="ml-2 text-lg font-medium text-on-surface-variant">({activeCards.length})</span>}
          </h1>
          <p className="text-on-surface-variant mt-1">Shareable profiles for sitters, walkers, and emergencies.</p>
        </div>
        {canCreateRevokePetCards && (
          <div className="flex gap-2">
            {pets.filter(p => !p.isPrivate).length >= 2 && (
              <button
                onClick={() => setShowMultiPetModal(true)}
                className="flex items-center gap-2 bg-tertiary hover:opacity-90 text-on-tertiary px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-lg">layers</span> Multi-pet Card
              </button>
            )}
            <button
              id="create-card-btn"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary-container hover:opacity-90 text-on-primary-container px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span> Create New Card
            </button>
          </div>
        )}
      </header>

      {/* Household Information Block — hidden when no cards and no info */}
      {(cards.length > 0 || generalInfo) && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-on-surface-variant">info</span>
              <h2 className="font-semibold text-on-surface text-sm">Household Information</h2>
            </div>
            <button
              onClick={() => {
                if (editingGeneralInfo) {
                  localStorage.setItem(GENERAL_INFO_KEY, generalInfo);
                }
                setEditingGeneralInfo(v => !v);
              }}
              className="text-xs text-primary-container hover:underline font-medium"
            >
              {editingGeneralInfo ? 'Save' : 'Edit'}
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mb-3">Household-level notes included when you opt in at card creation (gate codes, bowl ownership, etc.)</p>
          {editingGeneralInfo ? (
            <textarea
              value={generalInfo}
              onChange={e => setGeneralInfo(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="e.g. Gate code: 1234. Max's bowl is blue, Bella's is pink."
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          ) : (
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap break-words">
              {generalInfo || <span className="text-on-surface-variant/50 italic">No household information set.</span>}
            </p>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        /* Empty state — no cards created yet */
        <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-2xl">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mx-auto mb-4 block">qr_code_2</span>
          <h2 className="text-lg font-semibold text-on-surface mb-2" style={{ fontFamily: 'var(--font-headline)' }}>No cards yet</h2>
          <p className="text-on-surface-variant mb-5 max-w-sm mx-auto">
            {canCreateRevokePetCards
              ? `Create a Sitter, Vet, or Custom card for any of your ${pets.length} pet${pets.length > 1 ? 's' : ''}.`
              : 'You do not have permission to create pet cards. Ask your Family Leader to update your permissions.'}
          </p>
          {canCreateRevokePetCards && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-primary-container hover:opacity-90 text-on-primary-container px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span> Create Your First Card
            </button>
          )}
        </div>
      ) : (
        <>
        <div>
          {staleCardIds.size > 0 && (
            <div className="flex justify-end mb-3">
              <button
                onClick={handleUpdateAllCards}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container hover:opacity-90 transition-colors text-xs font-medium"
              >
                <span className="material-symbols-outlined text-sm">refresh</span> Update All
              </button>
            </div>
          )}
          <motion.div
            layout
            layoutDependency={[...activeCards, ...inactiveCards].map(c => c.id).join(',')}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {[...activeCards, ...inactiveCards].map((c, i) => (
              <CardGalleryTile
                key={c.id}
                card={c}
                pet={getPetForCard(c)}
                index={i}
                isStale={staleCardIds.has(c.id)}
                onTap={() => { setSelectedCardId(c.id); setDrawerCardId(c.id); }}
                onQr={() => { setSelectedCardId(c.id); setQrCardId(c.id); }}
              />
            ))}
          </motion.div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant hover:text-primary-container hover:border-primary-container/40 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-lg">add</span> Add Another Card
          </button>
        </div>

        {/* Hidden card preview for download */}
        <div className="sr-only" aria-hidden="true" data-card-preview>
          {selectedCard && selectedPet && (
            <div id={`card-preview-${selectedCard.id}`}>
              <CardPreview card={selectedCard} pet={selectedPet} />
            </div>
          )}
        </div>

        {/* Card Action Drawer (bottom sheet) */}
        {(() => {
          const drawerCard = cards.find(c => c.id === drawerCardId);
          if (!drawerCard) return null;
          const drawerPet = getPetForCard(drawerCard);
          return (
            <CardActionDrawer
              card={drawerCard}
              pet={drawerPet}
              open={!!drawerCardId}
              onClose={() => setDrawerCardId(null)}
              onQr={() => setQrCardId(drawerCard.id)}
              onDownload={() => handleDownloadCard(drawerCard.id)}
              onEdit={() => {
                setCardToEdit(drawerCard);
                if (drawerCard.petId === 'multi-pet') setShowMultiPetModal(true);
                else setShowCreateModal(true);
              }}
              onRevoke={() => handleRevoke(drawerCard.id)}
              onUndoRevoke={() => handleUndoRevoke(drawerCard.id)}
            />
          );
        })()}

        {/* QR Overlay */}
        <AnimatePresence>
          {qrCardId && (() => {
            const qrCard = cards.find(c => c.id === qrCardId);
            if (!qrCard) return null;
            const qrPet = getPetForCard(qrCard);
            return (
              <QrOverlay
                cardId={qrCard.id}
                pet={qrPet}
                expiresLabel={formatExpiry(qrCard.expiresAt)}
                onClose={() => setQrCardId(null)}
              />
            );
          })()}
        </AnimatePresence>
        </>
      )}

      {/* Modals — lazy-loaded to keep initial bundle small */}
      <Suspense fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <AnimatePresence>
          {showCreateModal && (
            <CreateCardModal
              key={cardToEdit?.id ?? 'new'}
              pets={pets}
              onClose={() => { setShowCreateModal(false); setCardToEdit(null); }}
              onCreate={handleCreate}
              generalInfoText={generalInfo}
              editCard={cardToEdit ?? undefined}
            />
          )}
          {showMultiPetModal && (
            <MultiPetCardModal
              pets={pets}
              onClose={() => { setShowMultiPetModal(false); setCardToEdit(null); }}
              onCreate={handleCreate}
              editCard={cardToEdit ?? undefined}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </motion.div>
  );
}
