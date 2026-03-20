/**
 * useOrchestrator — Primary search hook for the Pet-Aware Yelp Orchestrator.
 *
 * Manages pet selection, auto-derived tags, optional tag toggling,
 * live URL preview, search history, and post-redirect verification.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePets } from '../contexts/PetContext';
import { deriveSearchAugments } from '../data/breedIntelligence';
import {
  buildYelpURL,
  openYelpSearch,
  loadSearchHistory,
  type PreviewTag,
  type QueryLayers,
  type SearchHistoryEntry,
} from '../utils/yelpOrchestrator';

export function useOrchestrator(zip: string) {
  const { pets } = usePets();

  // Pet selection — default to first pet
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const selectedPet = useMemo(
    () => pets.find(p => p.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );

  // Auto-select first pet on mount
  useEffect(() => {
    if (!selectedPetId && pets.length > 0) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  // Derive tags from selected pet
  const augments = useMemo(() => {
    if (!selectedPet) return { defaultTags: [], optionalTags: [] };
    return deriveSearchAugments(selectedPet);
  }, [selectedPet]);

  // User-controlled optional tag state (starts with all optional tags active)
  const [activeOptionalTags, setActiveOptionalTags] = useState<string[]>([]);

  // Sync optional tags when pet changes
  useEffect(() => {
    setActiveOptionalTags(augments.optionalTags);
  }, [augments.optionalTags]);

  // Combined preview tags
  const [serviceType, setServiceType] = useState('Vets');

  const currentOutput = useMemo(() => {
    if (!selectedPet) return null;
    return buildYelpURL({
      pet: selectedPet,
      serviceType,
      zip,
      activeTags: activeOptionalTags,
    });
  }, [selectedPet, serviceType, zip, activeOptionalTags]);

  const previewTags: PreviewTag[] = currentOutput?.previewTags ?? [];
  const currentUrl: string = currentOutput?.url ?? '';
  const currentLayers: QueryLayers | null = currentOutput?.layers ?? null;

  // Search history
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadSearchHistory);

  // Manual query mode
  const [manualQuery, setManualQuery] = useState('');

  // Verification
  const [showVerification, setShowVerification] = useState(false);
  const [lastSearchEntry, setLastSearchEntry] = useState<SearchHistoryEntry | null>(null);

  // Listen for user returning from Yelp (within 30 min)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const lastRedirect = sessionStorage.getItem('petbase_last_redirect');
      if (!lastRedirect) return;
      const elapsed = Date.now() - Number(lastRedirect);
      const THIRTY_MINUTES = 30 * 60 * 1000;
      if (elapsed > 0 && elapsed < THIRTY_MINUTES) {
        sessionStorage.removeItem('petbase_last_redirect');
        setShowVerification(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Actions
  const executeSearch = useCallback((svcType?: string) => {
    if (!selectedPet) return;
    const type = svcType ?? serviceType;
    const entry = openYelpSearch({
      pet: selectedPet,
      serviceType: type,
      manualQuery: manualQuery || undefined,
      zip,
      activeTags: activeOptionalTags,
    });
    setLastSearchEntry(entry);
    setHistory(loadSearchHistory());
  }, [selectedPet, serviceType, manualQuery, zip, activeOptionalTags]);

  const removeOptionalTag = useCallback((tag: string) => {
    setActiveOptionalTags(prev => prev.filter(t => t !== tag));
  }, []);

  const addOptionalTag = useCallback((tag: string) => {
    setActiveOptionalTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  }, []);

  return {
    // Pet selection
    pets,
    selectedPetId,
    setSelectedPetId,
    selectedPet,

    // Tags
    defaultTags: augments.defaultTags,
    optionalTags: augments.optionalTags,
    activeOptionalTags,
    previewTags,

    // URL output
    currentUrl,
    currentLayers,

    // Service type
    serviceType,
    setServiceType,

    // Manual mode
    manualQuery,
    setManualQuery,

    // History
    history,

    // Verification
    showVerification,
    setShowVerification,
    lastSearchEntry,

    // Actions
    executeSearch,
    removeOptionalTag,
    addOptionalTag,
  };
}
