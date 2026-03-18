// app/src/pages/Cards.tsx
// Orchestration shell — ~150 lines. All types, constants, helpers, and sub-components
// live in cardExtensions.ts and app/src/components/cards/*.

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Plus, QrCode, Info, RefreshCw, ChevronDown, ChevronUp, PawPrint, Layers
} from 'lucide-react';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import type { Pet } from '../types/pet';
import {
  type PetCard, type CardTemplate, type CardStatus, type SharingToggles,
  GENERAL_INFO_KEY, UNDO_WINDOW_MS, MAX_INACTIVE_CARDS,
  getCardStatus, buildPetSnapshot, isPetDataStale, timeUntilExpiry
} from '../types/cardExtensions';
import {
  savePublicCard, updatePublicCardStatus, deletePublicCard,
  getPublicCardsForOwner, updatePublicCardStatusWithTimestamp,
  type PublicCardPetSnapshot
} from '../lib/firestoreService';
import { logActivity } from '../utils/activityLog';
import { markCardCreated } from '../components/GettingStartedGuide';
import { useHouseholdPermissions } from '../hooks/useHouseholdPermissions';
import { Confetti, useCelebration } from '../components/ui/Confetti';
import { CardPreview } from '../components/cards/CardPreview';
import { MultiPetCardPreview } from '../components/cards/MultiPetCardPreview';
import { AllPetsCardPreview } from '../components/cards/AllPetsCardPreview';
import { CardTile } from '../components/cards/CardTile';
import { CardLogEntry } from '../components/cards/CardLogEntry';

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

  /** Set of card IDs whose pet data has changed since the snapshot was taken. */
  const staleCardIds = useMemo(() => {
    const ids = new Set<string>();
    cards.filter(c => getCardStatus(c) === 'active' && c.petId !== 'multi-pet' && c.petId !== 'all-pets').forEach(c => {
      const pet = pets.find(p => p.id === c.petId);
      if (pet && isPetDataStale(c, pet)) ids.add(c.id);
    });
    return ids;
  }, [cards, pets]);

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

  /** Rebuild the petSnapshot for a single card using current pet data, then re-sync to Firestore. */
  const handleUpdateCard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.petId === 'multi-pet' || card.petId === 'all-pets') return;
    const pet = pets.find(p => p.id === card.petId);
    if (!pet || !user) return;
    const snapshot = buildPetSnapshot(pet, card.sharing, card.includeGeneralInfo ?? false, generalInfo, user.uid);
    const updated: PetCard = { ...card, petSnapshot: snapshot };
    setCards(prev => prev.map(c => c.id === cardId ? updated : c));
    // Firestore boundary: PublicCardDoc.sharing is Record<string,boolean>
    savePublicCard({
      id: updated.id, ownerId: user.uid, petId: updated.petId, template: updated.template,
      sharing: updated.sharing as unknown as Record<string, boolean>,
      expiresAt: updated.expiresAt, status: updated.status as 'active',
      createdAt: updated.createdAt, includeGeneralInfo: updated.includeGeneralInfo,
      petSnapshot: snapshot,
      fieldOrder: updated.fieldOrder,
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
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Pet Cards</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Shareable profiles for sitters, walkers, and emergencies.</p>
        </header>
        <div className="text-center py-20">
          <PawPrint className="w-14 h-14 text-neutral-200 dark:text-neutral-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">No pets yet</h2>
          <p className="text-neutral-400 dark:text-neutral-500 mb-6">Add your first pet before creating a card.</p>
          <Link to="/pets" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
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
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium px-4 py-2 rounded-xl shadow-lg pointer-events-none"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Pet Cards</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Shareable profiles for sitters, walkers, and emergencies.</p>
        </div>
        {canCreateRevokePetCards && (
          <div className="flex gap-2">
            {pets.filter(p => !p.isPrivate).length >= 2 && (
              <button
                onClick={() => setShowMultiPetModal(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <Layers className="w-4 h-4" /> Multi-pet Card
              </button>
            )}
            <button
              id="create-card-btn"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Card
            </button>
          </div>
        )}
      </header>

      {/* Household Information Block */}
      <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-neutral-400" />
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">Household Information</h2>
          </div>
          <button
            onClick={() => {
              if (editingGeneralInfo) {
                localStorage.setItem(GENERAL_INFO_KEY, generalInfo);
              }
              setEditingGeneralInfo(v => !v);
            }}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            {editingGeneralInfo ? 'Save' : 'Edit'}
          </button>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">Household-level notes included when you opt in at card creation (gate codes, bowl ownership, etc.)</p>
        {editingGeneralInfo ? (
          <textarea
            value={generalInfo}
            onChange={e => setGeneralInfo(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="e.g. Gate code: 1234. Max's bowl is blue, Bella's is pink."
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap break-words">
            {generalInfo || <span className="text-neutral-400 italic">No household information set.</span>}
          </p>
        )}
      </div>

      {cards.length === 0 ? (
        /* Empty state — no cards created yet */
        <div className="text-center py-16 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
          <QrCode className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">No cards yet</h2>
          <p className="text-neutral-400 dark:text-neutral-500 mb-5 max-w-sm mx-auto">
            {canCreateRevokePetCards
              ? `Create a Sitter, Vet, or Custom card for any of your ${pets.length} pet${pets.length > 1 ? 's' : ''}.`
              : 'You do not have permission to create pet cards. Ask your Family Leader to update your permissions.'}
          </p>
          {canCreateRevokePetCards && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Your First Card
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card Preview */}
          <div className="flex justify-center">
            {selectedCard ? (
              selectedCard.petId === 'multi-pet' ? (
                <div className="w-full max-w-md">
                  <MultiPetCardPreview pets={pets} card={selectedCard} />
                </div>
              ) : selectedCard.petId === 'all-pets' ? (
                <div className="w-full max-w-md">
                  <AllPetsCardPreview pets={pets} card={selectedCard} />
                </div>
              ) : selectedPet ? (
                (selectedCard.status === 'revoked' && selectedCard.revokedAt && Date.now() >= selectedCard.revokedAt + UNDO_WINDOW_MS) ? (
                  <div className="w-full max-w-md">
                    <CardLogEntry card={selectedCard} pet={selectedPet} />
                  </div>
                ) : (
                  <div className="w-full max-w-md">
                    <CardPreview card={selectedCard} pet={selectedPet} />
                  </div>
                )
              ) : null
            ) : (
              <div className="flex w-full max-w-md items-center justify-center h-64 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
                <p className="text-neutral-400 dark:text-neutral-500 text-sm">Select a card to preview</p>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            {(() => {
              const activeCards = cards.filter(c => getCardStatus(c) === 'active');
              const inactiveCards = cards.filter(c => getCardStatus(c) !== 'active').slice(0, MAX_INACTIVE_CARDS);
              return (
                <>
                  {/* Active cards panel */}
                  <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Active Cards</h3>
                      <div className="flex items-center gap-2">
                        {staleCardIds.size > 0 && (
                          <button
                            onClick={handleUpdateAllCards}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-950/60 transition-colors text-xs font-medium"
                          >
                            <RefreshCw className="w-3 h-3" /> Update All
                          </button>
                        )}
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{activeCards.length} card{activeCards.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {activeCards.length === 0 && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-3">No active cards</p>
                      )}
                      {activeCards.map(c => {
                        const pet = c.petId === 'all-pets'
                          ? { id: 'all-pets', name: 'All Pets', breed: `${pets.filter(p => !p.isPrivate).length} pets`, image: '', age: '', weight: '', notes: '' } as Pet
                          : c.petId === 'multi-pet'
                            ? { id: 'multi-pet', name: 'Multi-pet Card', breed: `${c.multiPetConfig?.length ?? 0} pets selected`, image: '', age: '', weight: '', notes: '' } as Pet
                            : pets.find(p => p.id === c.petId);
                        if (!pet) return null;
                        return (
                          <CardTile
                            key={c.id}
                            card={c}
                            pet={pet}
                            selected={selectedCardId === c.id}
                            onSelect={() => setSelectedCardId(c.id)}
                            isStale={staleCardIds.has(c.id)}
                            onUpdate={() => handleUpdateCard(c.id)}
                            onRevoke={() => handleRevoke(c.id)}
                            onUndoRevoke={() => handleUndoRevoke(c.id)}
                            onCopied={handleCopied}
                            onEdit={() => {
                              setCardToEdit(c);
                              if (c.petId === 'multi-pet') setShowMultiPetModal(true);
                              else setShowCreateModal(true);
                            }}
                          />
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add Another Card
                    </button>
                  </div>

                  {/* Revoked & Expired section — collapsed by default */}
                  {inactiveCards.length > 0 && (
                    <div className="bg-neutral-50/80 dark:bg-neutral-800/50 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                      <button
                        onClick={() => setRevokedSectionOpen(o => !o)}
                        className="w-full flex items-center justify-between p-4 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Revoked &amp; Expired ({inactiveCards.length})
                        </span>
                        {revokedSectionOpen
                          ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                          : <ChevronDown className="w-4 h-4 text-neutral-400" />
                        }
                      </button>
                      {revokedSectionOpen && (
                        <div className="px-4 pb-4 space-y-1">
                          {inactiveCards.map(c => {
                            const pet = c.petId === 'all-pets'
                              ? { id: 'all-pets', name: 'All Pets', breed: `${pets.filter(p => !p.isPrivate).length} pets`, image: '', age: '', weight: '', notes: '' } as Pet
                              : c.petId === 'multi-pet'
                                ? { id: 'multi-pet', name: 'Multi-pet Card', breed: `${c.multiPetConfig?.length ?? 0} pets selected`, image: '', age: '', weight: '', notes: '' } as Pet
                                : pets.find(p => p.id === c.petId);
                            if (!pet) return null;
                            return (
                              <CardTile
                                key={c.id}
                                card={c}
                                pet={pet}
                                selected={selectedCardId === c.id}
                                onSelect={() => setSelectedCardId(c.id)}
                                onUndoRevoke={() => handleUndoRevoke(c.id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modals — lazy-loaded to keep initial bundle small */}
      <Suspense fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
